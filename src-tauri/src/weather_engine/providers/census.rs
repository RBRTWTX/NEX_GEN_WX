use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{json, Value};
use std::collections::HashSet;

use super::types::BBox;

const TIGER_STATE_COUNTY_URL: &str =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer";
const CENSUS_2020_PLACES_URL: &str =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer";
const STATE_LAYER: u8 = 6;
const COUNTY_LAYER: u8 = 7;
const INCORPORATED_PLACE_LAYER: u8 = 26;
const CENSUS_DESIGNATED_PLACE_LAYER: u8 = 28;

fn arc_url(service: &str, layer: u8) -> Result<Url, StudioError> {
    Url::parse(&format!("{service}/{layer}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))
}

fn append_common_bbox_query(
    url: &mut Url,
    bbox: BBox,
    out_fields: &str,
    where_clause: &str,
    return_geometry: bool,
) {
    let envelope = bbox.envelope();
    url.query_pairs_mut()
        .append_pair("where", where_clause)
        .append_pair("geometry", &envelope)
        .append_pair("geometryType", "esriGeometryEnvelope")
        .append_pair("spatialRel", "esriSpatialRelIntersects")
        .append_pair("inSR", "4326")
        .append_pair("outSR", "4326")
        .append_pair("outFields", out_fields)
        .append_pair("returnGeometry", if return_geometry { "true" } else { "false" })
        .append_pair("returnExceededLimitFeatures", "true")
        .append_pair("f", "geojson");
}

fn geometry_bounds(value: &Value, bounds: &mut Option<[f64; 4]>) {
    match value {
        Value::Array(items) => {
            if items.len() >= 2 && items[0].is_number() && items[1].is_number() {
                if let (Some(x), Some(y)) = (items[0].as_f64(), items[1].as_f64()) {
                    match bounds {
                        Some(current) => {
                            current[0] = current[0].min(x);
                            current[1] = current[1].min(y);
                            current[2] = current[2].max(x);
                            current[3] = current[3].max(y);
                        }
                        None => *bounds = Some([x, y, x, y]),
                    }
                }
            } else {
                for item in items {
                    geometry_bounds(item, bounds);
                }
            }
        }
        Value::Object(object) => {
            if let Some(coordinates) = object.get("coordinates") {
                geometry_bounds(coordinates, bounds);
            }
            if let Some(geometries) = object.get("geometries") {
                geometry_bounds(geometries, bounds);
            }
        }
        _ => {}
    }
}

fn property_number(properties: &serde_json::Map<String, Value>, name: &str) -> Option<f64> {
    match properties.get(name) {
        Some(Value::Number(number)) => number.as_f64(),
        Some(Value::String(value)) => value.trim().parse::<f64>().ok(),
        _ => None,
    }
}

fn clean_place_display_name(properties: &serde_json::Map<String, Value>) -> String {
    if let Some(basename) = properties
        .get("BASENAME")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return basename.to_string();
    }

    let name = properties
        .get("NAME")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("Place");

    for suffix in [" city", " town", " village", " borough", " municipality", " CDP"] {
        if let Some(base) = name.strip_suffix(suffix) {
            let cleaned = base.trim();
            if !cleaned.is_empty() {
                return cleaned.to_string();
            }
        }
    }
    name.to_string()
}

fn polygon_feature_to_point(feature: &Value) -> Option<Value> {
    let mut properties = feature
        .get("properties")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let coordinate = property_number(&properties, "INTPTLON")
        .zip(property_number(&properties, "INTPTLAT"))
        .or_else(|| {
            let mut bounds = None;
            geometry_bounds(feature.get("geometry")?, &mut bounds);
            let [west, south, east, north] = bounds?;
            Some(((west + east) / 2.0, (south + north) / 2.0))
        })?;
    if !properties.contains_key("displayName") {
        let name = clean_place_display_name(&properties);
        properties.insert("displayName".to_string(), Value::String(name));
    }
    Some(json!({
        "type": "Feature",
        "id": feature.get("id").cloned().unwrap_or(Value::Null),
        "properties": properties,
        "geometry": { "type": "Point", "coordinates": [coordinate.0, coordinate.1] }
    }))
}

fn arcgis_record_to_point(feature: &Value) -> Option<Value> {
    let mut properties = feature
        .get("attributes")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let coordinate = property_number(&properties, "INTPTLON")
        .zip(property_number(&properties, "INTPTLAT"))?;
    let name = clean_place_display_name(&properties);
    properties.insert("displayName".to_string(), Value::String(name));
    Some(json!({
        "type": "Feature",
        "id": properties.get("GEOID").cloned().unwrap_or(Value::Null),
        "properties": properties,
        "geometry": { "type": "Point", "coordinates": [coordinate.0, coordinate.1] }
    }))
}

fn place_features(collection: &Value) -> Vec<Value> {
    collection
        .get("features")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|feature| {
                    if feature.get("properties").is_some() {
                        polygon_feature_to_point(feature)
                    } else {
                        arcgis_record_to_point(feature)
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

fn place_limit(zoom: f64, density: u8) -> usize {
    let base = if zoom < 4.25 {
        70
    } else if zoom < 5.0 {
        120
    } else if zoom < 6.5 {
        240
    } else if zoom < 8.0 {
        420
    } else if zoom < 10.0 {
        700
    } else {
        1100
    };
    let density_factor = 0.35 + (f64::from(density.min(100)) / 100.0) * 1.15;
    ((base as f64) * density_factor).round().clamp(40.0, 1500.0) as usize
}

fn population(feature: &Value) -> f64 {
    feature
        .get("properties")
        .and_then(Value::as_object)
        .and_then(|properties| property_number(properties, "POP100"))
        .unwrap_or(0.0)
}

fn area_land(feature: &Value) -> f64 {
    feature
        .get("properties")
        .and_then(Value::as_object)
        .and_then(|properties| property_number(properties, "AREALAND"))
        .unwrap_or(0.0)
}

fn add_label_rank(feature: &mut Value, rank: usize) {
    if let Some(properties) = feature.get_mut("properties").and_then(Value::as_object_mut) {
        properties.insert("labelRank".to_string(), Value::Number((rank as u64).into()));
    }
}

pub async fn state_boundaries(force: bool) -> Result<Value, StudioError> {
    let mut url = arc_url(TIGER_STATE_COUNTY_URL, STATE_LAYER)?;
    url.query_pairs_mut()
        .append_pair("where", "STATE NOT IN ('60','66','69','72','78')")
        .append_pair("outFields", "STATE,NAME,BASENAME")
        .append_pair("returnGeometry", "true")
        .append_pair("outSR", "4326")
        .append_pair("maxAllowableOffset", "0.02")
        .append_pair("f", "geojson");
    provider_client::fetch_json_cached(
        url,
        24 * 60 * 60,
        force,
        "application/geo+json, application/json",
    )
    .await
}

pub async fn county_boundaries(
    bbox: BBox,
    zoom: f64,
    force: bool,
) -> Result<Value, StudioError> {
    let bbox = bbox.validate()?;
    let mut url = arc_url(TIGER_STATE_COUNTY_URL, COUNTY_LAYER)?;
    append_common_bbox_query(&mut url, bbox, "STATE,COUNTY,NAME,BASENAME", "1=1", true);
    let offset = if zoom < 5.0 {
        0.08
    } else if zoom < 7.0 {
        0.025
    } else if zoom < 9.0 {
        0.008
    } else {
        0.0015
    };
    url.query_pairs_mut()
        .append_pair("maxAllowableOffset", &offset.to_string())
        .append_pair("geometryPrecision", "5")
        .append_pair("resultRecordCount", "7000");
    provider_client::fetch_json_cached(
        url,
        12 * 60 * 60,
        force,
        "application/geo+json, application/json",
    )
    .await
}

fn places_query_url(layer: u8, bbox: BBox, provider_record_limit: usize) -> Result<Url, StudioError> {
    let mut url = arc_url(CENSUS_2020_PLACES_URL, layer)?;
    let envelope = bbox.envelope();
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("geometry", &envelope)
        .append_pair("geometryType", "esriGeometryEnvelope")
        .append_pair("spatialRel", "esriSpatialRelIntersects")
        .append_pair("inSR", "4326")
        .append_pair("outFields", "GEOID,NAME,BASENAME,LSADC,STATE,INTPTLAT,INTPTLON,POP100,AREALAND")
        .append_pair("orderByFields", "POP100 DESC")
        .append_pair("returnGeometry", "false")
        .append_pair("resultRecordCount", &provider_record_limit.to_string())
        .append_pair("returnExceededLimitFeatures", "true")
        .append_pair("f", "json");
    Ok(url)
}

pub async fn places(
    bbox: BBox,
    zoom: f64,
    density: u8,
    force: bool,
) -> Result<Value, StudioError> {
    let bbox = bbox.validate()?;
    if zoom < 2.5 {
        return Ok(json!({
            "type": "FeatureCollection",
            "features": [],
            "provider": "U.S. Census Bureau 2020 places",
            "cacheStatus": "not-requested"
        }));
    }

    let limit = place_limit(zoom, density);
    // The Census service supports server-side ordering. Fetch only a bounded
    // population-ranked candidate set, then merge incorporated places and CDPs
    // locally. This keeps CONUS and move-end requests responsive.
    let provider_record_limit = (limit.saturating_mul(4)).clamp(240, 5000);
    let mut features = Vec::new();
    let mut warnings = Vec::new();
    let mut cache_status = "live".to_string();

    for layer in [INCORPORATED_PLACE_LAYER, CENSUS_DESIGNATED_PLACE_LAYER] {
        let url = places_query_url(layer, bbox, provider_record_limit)?;

        match provider_client::fetch_json_cached(
            url,
            12 * 60 * 60,
            force,
            "application/geo+json, application/json",
        )
        .await
        {
            Ok(collection) => {
                if collection.get("cacheStatus").and_then(Value::as_str) == Some("stale") {
                    cache_status = "stale".to_string();
                }
                if let Some(warning) = collection.get("cacheWarning").and_then(Value::as_str) {
                    warnings.push(warning.to_string());
                }
                features.extend(place_features(&collection));
            }
            Err(error) => warnings.push(error.to_string()),
        }
    }

    features.sort_by(|left, right| {
        population(right)
            .partial_cmp(&population(left))
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                area_land(right)
                    .partial_cmp(&area_land(left))
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
    });
    let mut seen = HashSet::new();
    features.retain(|feature| {
        let key = feature
            .get("properties")
            .and_then(|value| value.get("GEOID"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        key.is_empty() || seen.insert(key)
    });
    features.truncate(limit);
    for (rank, feature) in features.iter_mut().enumerate() {
        add_label_rank(feature, rank);
    }

    if features.is_empty() && !warnings.is_empty() {
        return Err(StudioError::Provider(format!(
            "Census places queries failed: {}",
            warnings.join("; ")
        )));
    }

    let mut result = json!({
        "type": "FeatureCollection",
        "features": features,
        "provider": "U.S. Census Bureau 2020 places",
        "labelLimit": limit,
        "cacheStatus": cache_status
    });
    if !warnings.is_empty() {
        result["cacheWarning"] = Value::String(warnings.join("; "));
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_tiger_layers_are_pinned() {
        assert_eq!(STATE_LAYER, 6);
        assert_eq!(COUNTY_LAYER, 7);
        assert_eq!(INCORPORATED_PLACE_LAYER, 26);
        assert_eq!(CENSUS_DESIGNATED_PLACE_LAYER, 28);
    }

    #[test]
    fn density_changes_label_limit() {
        assert!(place_limit(6.0, 10) < place_limit(6.0, 90));
    }
    #[test]
    fn current_places_query_uses_supported_fields_and_point_attributes() {
        let url = places_query_url(
            INCORPORATED_PLACE_LAYER,
            BBox { west: -99.0, south: 29.0, east: -98.0, north: 30.0 },
            8000,
        )
        .expect("valid places query");
        let query = url.query().expect("query string");
        assert!(query.contains("INTPTLAT"));
        assert!(query.contains("INTPTLON"));
        assert!(query.contains("AREALAND"));
        assert!(query.contains("POP100"));
        assert!(query.contains("orderByFields=POP100+DESC") || query.contains("orderByFields=POP100%20DESC"));
        assert!(query.contains("returnGeometry=false"));
        assert!(query.contains("geometryType=esriGeometryEnvelope"));
        assert!(query.contains("f=json"));
    }

    #[test]
    fn arcgis_attribute_records_are_normalized_to_geojson_points() {
        let collection = json!({
            "features": [{
                "attributes": {
                    "GEOID": "4805000",
                    "NAME": "Example city",
                    "BASENAME": "Example",
                    "INTPTLAT": "+29.5000000",
                    "INTPTLON": "-098.5000000",
                    "POP100": 120000,
                    "AREALAND": "12345"
                }
            }]
        });
        let points = place_features(&collection);
        assert_eq!(points.len(), 1);
        assert_eq!(points[0]["geometry"]["type"], "Point");
        assert_eq!(points[0]["properties"]["displayName"], "Example");
        assert_eq!(points[0]["properties"]["NAME"], "Example city");
    }

    #[test]
    fn legal_place_suffixes_are_not_broadcast_labels() {
        for (name, expected) in [
            ("San Antonio city", "San Antonio"),
            ("Hollywood Park town", "Hollywood Park"),
            ("Timberwood Park CDP", "Timberwood Park"),
        ] {
            let properties = serde_json::Map::from_iter([(
                "NAME".to_string(),
                Value::String(name.to_string()),
            )]);
            assert_eq!(clean_place_display_name(&properties), expected);
        }
    }
}
