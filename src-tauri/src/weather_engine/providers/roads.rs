use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{json, Value};

use super::types::BBox;

const TRANSPORTATION_URL: &str =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer";
const PRIMARY_ROADS_LAYER: u8 = 2;
const SECONDARY_ROADS_LAYER: u8 = 6;
const LOCAL_ROADS_LAYER: u8 = 8;

fn road_limit(zoom: f64, density: u8) -> usize {
    let base = if zoom < 6.0 { 2500 } else if zoom < 8.0 { 5500 } else if zoom < 10.0 { 9000 } else { 14000 };
    let factor = 0.35 + (f64::from(density.min(100)) / 100.0) * 0.9;
    ((base as f64) * factor).round().clamp(1000.0, 18000.0) as usize
}

fn selected_layers(zoom: f64, density: u8) -> Vec<(u8, &'static str)> {
    let mut layers = vec![(PRIMARY_ROADS_LAYER, "major")];
    if zoom >= 5.0 && density >= 28 {
        layers.push((SECONDARY_ROADS_LAYER, "secondary"));
    }
    if zoom >= 9.0 && density >= 72 {
        layers.push((LOCAL_ROADS_LAYER, "local"));
    }
    layers
}

fn road_query_url(layer: u8, bbox: BBox, zoom: f64, limit: usize) -> Result<Url, StudioError> {
    let mut url = Url::parse(&format!("{TRANSPORTATION_URL}/{layer}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))?;
    let offset = if zoom < 6.0 { 0.025 } else if zoom < 8.0 { 0.008 } else if zoom < 10.0 { 0.0025 } else { 0.0006 };
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("geometry", &bbox.envelope())
        .append_pair("geometryType", "esriGeometryEnvelope")
        .append_pair("spatialRel", "esriSpatialRelIntersects")
        .append_pair("inSR", "4326")
        .append_pair("outSR", "4326")
        .append_pair("outFields", "OID,NAME,BASENAME,RTTYP,MTFCC")
        .append_pair("returnGeometry", "true")
        .append_pair("maxAllowableOffset", &offset.to_string())
        .append_pair("geometryPrecision", "5")
        .append_pair("resultRecordCount", &limit.to_string())
        .append_pair("returnExceededLimitFeatures", "true")
        .append_pair("f", "geojson");
    Ok(url)
}

fn normalized_features(collection: &Value, tier: &str) -> Vec<Value> {
    collection
        .get("features")
        .and_then(Value::as_array)
        .map(|items| {
            items.iter().filter_map(|feature| {
                let mut item = feature.clone();
                let properties = item.get_mut("properties")?.as_object_mut()?;
                let display = properties.get("NAME")
                    .or_else(|| properties.get("BASENAME"))
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .trim()
                    .to_string();
                properties.insert("roadTier".to_string(), Value::String(tier.to_string()));
                properties.insert("displayName".to_string(), Value::String(display));
                Some(item)
            }).collect()
        })
        .unwrap_or_default()
}

pub async fn roads(bbox: BBox, zoom: f64, density: u8, force: bool) -> Result<Value, StudioError> {
    let bbox = bbox.validate()?;
    if zoom < 3.5 || density == 0 {
        return Ok(json!({
            "type": "FeatureCollection",
            "features": [],
            "provider": "U.S. Census Bureau 2025 transportation",
            "cacheStatus": "not-requested"
        }));
    }

    let layers = selected_layers(zoom, density);
    let per_layer_limit = road_limit(zoom, density);
    let mut features = Vec::new();
    let mut warnings = Vec::new();
    let mut cache_status = "live".to_string();

    for (layer, tier) in layers {
        let url = road_query_url(layer, bbox, zoom, per_layer_limit)?;
        match provider_client::fetch_json_cached(
            url,
            6 * 60 * 60,
            force,
            "application/geo+json, application/json",
        ).await {
            Ok(collection) => {
                if collection.get("cacheStatus").and_then(Value::as_str) == Some("stale") {
                    cache_status = "stale".to_string();
                }
                if let Some(warning) = collection.get("cacheWarning").and_then(Value::as_str) {
                    warnings.push(warning.to_string());
                }
                features.extend(normalized_features(&collection, tier));
            }
            Err(error) => warnings.push(format!("{tier} roads: {error}")),
        }
    }

    if features.is_empty() && !warnings.is_empty() {
        return Err(StudioError::Provider(format!("Census road queries failed: {}", warnings.join("; "))));
    }

    let mut result = json!({
        "type": "FeatureCollection",
        "features": features,
        "provider": "U.S. Census Bureau 2025 transportation",
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
    fn road_layers_match_current_transportation_service() {
        assert_eq!(PRIMARY_ROADS_LAYER, 2);
        assert_eq!(SECONDARY_ROADS_LAYER, 6);
        assert_eq!(LOCAL_ROADS_LAYER, 8);
    }

    #[test]
    fn road_detail_increases_only_at_useful_zoom_and_density() {
        assert_eq!(selected_layers(4.0, 100).len(), 1);
        assert_eq!(selected_layers(7.0, 50).len(), 2);
        assert_eq!(selected_layers(10.0, 80).len(), 3);
        assert_eq!(selected_layers(10.0, 50).len(), 2);
    }

    #[test]
    fn road_query_is_extent_scoped_geojson() {
        let url = road_query_url(
            PRIMARY_ROADS_LAYER,
            BBox { west: -99.0, south: 29.0, east: -98.0, north: 30.0 },
            7.0,
            5000,
        ).unwrap();
        let query = url.query().unwrap_or_default();
        assert!(query.contains("geometryType=esriGeometryEnvelope"));
        assert!(query.contains("outSR=4326"));
        assert!(query.contains("RTTYP"));
        assert!(query.contains("f=geojson"));
    }
}
