use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{json, Value};

const NHC_SUMMARY_SERVICE: &str =
    "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer";
const NHC_PEAK_STORM_SURGE_SERVICE: &str =
    "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_PeakStormSurge/MapServer";
const TROPICAL_TTL_SECONDS: u64 = 180;
const OUTLOOK_TWO_DAY_LOCATION_LAYER: u8 = 1;
const OUTLOOK_SEVEN_DAY_LOCATION_LAYER: u8 = 2;
const OUTLOOK_SEVEN_DAY_REGION_LAYER: u8 = 3;
const FORECAST_POINTS_LAYER: u8 = 5;
const FORECAST_TRACK_LAYER: u8 = 6;
const FORECAST_CONE_LAYER: u8 = 7;
const WATCH_WARNING_LAYER: u8 = 8;
const WIND_PROBABILITY_34_LAYER: u8 = 30;
const WIND_PROBABILITY_50_LAYER: u8 = 31;
const WIND_PROBABILITY_64_LAYER: u8 = 32;
const OUTLOOK_SEVEN_DAY_MOTION_LAYER: u8 = 33;
const ARRIVAL_EARLIEST_LAYER: u8 = 18;
const ARRIVAL_MOST_LIKELY_LAYER: u8 = 19;
const INUNDATION_FOOTPRINT_LAYER: u8 = 23;
const INUNDATION_IMAGE_LAYER: u8 = 24;
const PEAK_SURGE_POINTS_LAYER: u8 = 0;
const PEAK_SURGE_LINES_LAYER: u8 = 1;
const PEAK_SURGE_POLYGONS_LAYER: u8 = 2;

fn layer_query_url(layer: u8) -> Result<Url, StudioError> {
    let mut url = Url::parse(&format!("{NHC_SUMMARY_SERVICE}/{layer}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("outFields", "*")
        .append_pair("returnGeometry", "true")
        .append_pair("outSR", "4326")
        .append_pair("f", "geojson");
    Ok(url)
}

fn peak_layer_query_url(layer: u8) -> Result<Url, StudioError> {
    let mut url = Url::parse(&format!("{NHC_PEAK_STORM_SURGE_SERVICE}/{layer}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("outFields", "*")
        .append_pair("returnGeometry", "true")
        .append_pair("outSR", "4326")
        .append_pair("f", "geojson");
    Ok(url)
}

fn empty_collection() -> Value {
    json!({ "type": "FeatureCollection", "features": [] })
}

fn cache_status(value: &Value) -> &str {
    value.get("cacheStatus").and_then(Value::as_str).unwrap_or("live")
}

fn cache_warning(value: &Value) -> Option<&str> {
    value.get("cacheWarning").and_then(Value::as_str)
}

fn collection_or_failure(
    label: &str,
    result: Result<Value, StudioError>,
    failures: &mut Vec<String>,
) -> Value {
    match result {
        Ok(value) if is_feature_collection(&value) => value,
        Ok(_) => {
            failures.push(format!("{label} did not return a GeoJSON FeatureCollection"));
            empty_collection()
        }
        Err(error) => {
            failures.push(format!("{label} unavailable: {error}"));
            empty_collection()
        }
    }
}

fn is_feature_collection(value: &Value) -> bool {
    value.get("type").and_then(Value::as_str) == Some("FeatureCollection")
        && value.get("features").and_then(Value::as_array).is_some()
}

fn combined_status(results: &[&Result<Value, StudioError>]) -> (String, Vec<String>) {
    let successful = results
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .filter(|value| is_feature_collection(value))
        .collect::<Vec<_>>();
    let status = if successful.iter().any(|value| cache_status(value) == "stale") {
        "stale"
    } else if !successful.is_empty()
        && successful.iter().all(|value| cache_status(value) == "fresh-cache")
    {
        "fresh-cache"
    } else {
        "live"
    };
    let warnings = successful
        .iter()
        .filter_map(|value| cache_warning(value))
        .map(str::to_string)
        .collect::<Vec<_>>();
    (status.to_string(), warnings)
}

fn combine_catalog(
    points_result: Result<Value, StudioError>,
    track_result: Result<Value, StudioError>,
    cone_result: Result<Value, StudioError>,
    warnings_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let results = [&points_result, &track_result, &cone_result, &warnings_result];
    let valid_count = results
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .filter(|value| is_feature_collection(value))
        .count();
    if valid_count == 0 {
        let errors = results
            .iter()
            .filter_map(|result| result.as_ref().err())
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        let detail = if errors.is_empty() {
            "all four NHC layers returned invalid GeoJSON".to_string()
        } else {
            errors.join("; ")
        };
        return Err(StudioError::Provider(format!(
            "NHC Tropical Weather Summary failed: {detail}"
        )));
    }

    let (status, mut failures) = combined_status(&results);
    let points = collection_or_failure("NHC forecast points", points_result, &mut failures);
    let track = collection_or_failure("NHC forecast track", track_result, &mut failures);
    let cone = collection_or_failure("NHC forecast cone", cone_result, &mut failures);
    let warnings = collection_or_failure("NHC watches/warnings", warnings_result, &mut failures);

    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "points": points,
        "track": track,
        "cone": cone,
        "warnings": warnings,
        "cacheStatus": status,
    });
    if !failures.is_empty() {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(failures.join("; ")));
        }
    }
    Ok(output)
}

fn combine_two_day_outlook(
    locations_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let locations = match locations_result {
        Ok(value) if is_feature_collection(&value) => value,
        Ok(_) => {
            return Err(StudioError::Provider(
                "NHC 2-Day Tropical Weather Outlook did not return GeoJSON locations".to_string(),
            ))
        }
        Err(error) => {
            return Err(StudioError::Provider(format!(
                "NHC 2-Day Tropical Weather Outlook unavailable: {error}"
            )))
        }
    };
    let status = cache_status(&locations).to_string();
    let warning = cache_warning(&locations).map(str::to_string);
    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "period": "2day",
        "locations": locations,
        "regions": empty_collection(),
        "motion": empty_collection(),
        "cacheStatus": status,
    });
    if let Some(warning) = warning {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warning));
        }
    }
    Ok(output)
}

fn combine_outlook_catalog(
    period: &str,
    locations_result: Result<Value, StudioError>,
    regions_result: Result<Value, StudioError>,
    motion_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let results = [&locations_result, &regions_result, &motion_result];
    let valid_count = results
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .filter(|value| is_feature_collection(value))
        .count();
    if valid_count == 0 {
        let errors = results
            .iter()
            .filter_map(|result| result.as_ref().err())
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        let detail = if errors.is_empty() {
            "all NHC outlook layers returned invalid GeoJSON".to_string()
        } else {
            errors.join("; ")
        };
        return Err(StudioError::Provider(format!(
            "NHC Tropical Weather Outlook failed: {detail}"
        )));
    }

    let (status, mut failures) = combined_status(&results);
    let locations = collection_or_failure("NHC outlook locations", locations_result, &mut failures);
    let regions = collection_or_failure("NHC outlook regions", regions_result, &mut failures);
    let motion = collection_or_failure("NHC outlook motion", motion_result, &mut failures);

    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "period": period,
        "locations": locations,
        "regions": regions,
        "motion": motion,
        "cacheStatus": status,
    });
    if !failures.is_empty() {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(failures.join("; ")));
        }
    }
    Ok(output)
}

pub async fn tropical_catalog(force: bool) -> Result<Value, StudioError> {
    let points = provider_client::fetch_json_cached(
        layer_query_url(FORECAST_POINTS_LAYER)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    let track = provider_client::fetch_json_cached(
        layer_query_url(FORECAST_TRACK_LAYER)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    let cone = provider_client::fetch_json_cached(
        layer_query_url(FORECAST_CONE_LAYER)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    let warnings = provider_client::fetch_json_cached(
        layer_query_url(WATCH_WARNING_LAYER)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    combine_catalog(points, track, cone, warnings)
}

pub async fn tropical_outlook_catalog(
    period: &str,
    force: bool,
) -> Result<Value, StudioError> {
    match period.trim().to_ascii_lowercase().as_str() {
        "2day" => {
            let locations = provider_client::fetch_json_cached(
                layer_query_url(OUTLOOK_TWO_DAY_LOCATION_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            combine_two_day_outlook(locations)
        }
        "7day" => {
            let locations = provider_client::fetch_json_cached(
                layer_query_url(OUTLOOK_SEVEN_DAY_LOCATION_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            let regions = provider_client::fetch_json_cached(
                layer_query_url(OUTLOOK_SEVEN_DAY_REGION_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            let motion = provider_client::fetch_json_cached(
                layer_query_url(OUTLOOK_SEVEN_DAY_MOTION_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            combine_outlook_catalog("7day", locations, regions, motion)
        }
        _ => Err(StudioError::Provider(
            "NHC Tropical Weather Outlook period must be 2day or 7day".to_string(),
        )),
    }
}


fn wind_probability_layer(threshold_knots: u16) -> Result<u8, StudioError> {
    match threshold_knots {
        34 => Ok(WIND_PROBABILITY_34_LAYER),
        50 => Ok(WIND_PROBABILITY_50_LAYER),
        64 => Ok(WIND_PROBABILITY_64_LAYER),
        _ => Err(StudioError::Provider(
            "NHC wind-probability threshold must be 34, 50, or 64 knots".to_string(),
        )),
    }
}

fn combine_wind_probability_catalog(
    threshold_knots: u16,
    result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let probabilities = match result {
        Ok(value) if is_feature_collection(&value) => value,
        Ok(_) => {
            return Err(StudioError::Provider(format!(
                "NHC {threshold_knots}-kt wind probabilities did not return GeoJSON"
            )))
        }
        Err(error) => {
            return Err(StudioError::Provider(format!(
                "NHC {threshold_knots}-kt wind probabilities unavailable: {error}"
            )))
        }
    };
    let status = cache_status(&probabilities).to_string();
    let warning = cache_warning(&probabilities).map(str::to_string);
    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "thresholdKnots": threshold_knots,
        "probabilities": probabilities,
        "cacheStatus": status,
    });
    if let Some(warning) = warning {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warning));
        }
    }
    Ok(output)
}

pub async fn tropical_wind_probability_catalog(
    threshold_knots: u16,
    force: bool,
) -> Result<Value, StudioError> {
    let layer = wind_probability_layer(threshold_knots)?;
    let probabilities = provider_client::fetch_json_cached(
        layer_query_url(layer)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    combine_wind_probability_catalog(threshold_knots, probabilities)
}


fn arrival_time_layer(mode: &str) -> Result<(u8, &'static str), StudioError> {
    match mode.trim().to_ascii_lowercase().as_str() {
        "earliest" => Ok((ARRIVAL_EARLIEST_LAYER, "earliest")),
        "most-likely" => Ok((ARRIVAL_MOST_LIKELY_LAYER, "most-likely")),
        _ => Err(StudioError::Provider(
            "NHC arrival-time mode must be earliest or most-likely".to_string(),
        )),
    }
}

fn combine_arrival_time_catalog(
    mode: &str,
    result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let contours = match result {
        Ok(value) if is_feature_collection(&value) => value,
        Ok(_) => {
            return Err(StudioError::Provider(format!(
                "NHC {mode} arrival-time contours did not return GeoJSON"
            )))
        }
        Err(error) => {
            return Err(StudioError::Provider(format!(
                "NHC {mode} arrival-time contours unavailable: {error}"
            )))
        }
    };
    let status = cache_status(&contours).to_string();
    let warning = cache_warning(&contours).map(str::to_string);
    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "mode": mode,
        "contours": contours,
        "cacheStatus": status,
    });
    if let Some(warning) = warning {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warning));
        }
    }
    Ok(output)
}

pub async fn tropical_arrival_time_catalog(
    mode: &str,
    force: bool,
) -> Result<Value, StudioError> {
    let (layer, normalized_mode) = arrival_time_layer(mode)?;
    let contours = provider_client::fetch_json_cached(
        layer_query_url(layer)?,
        TROPICAL_TTL_SECONDS,
        force,
        "application/geo+json,application/json",
    )
    .await;
    combine_arrival_time_catalog(normalized_mode, contours)
}

fn combine_potential_storm_surge_catalog(
    result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let footprint = match result {
        Ok(value) if is_feature_collection(&value) => value,
        Ok(_) => {
            return Err(StudioError::Provider(
                "NHC potential storm-surge footprint did not return GeoJSON".to_string(),
            ))
        }
        Err(error) => {
            return Err(StudioError::Provider(format!(
                "NHC potential storm-surge footprint unavailable: {error}"
            )))
        }
    };
    let status = cache_status(&footprint).to_string();
    let warning = cache_warning(&footprint).map(str::to_string);
    let mut output = json!({
        "provider": "NOAA/NWS/NHC Tropical Weather Summary",
        "product": "potential",
        "footprint": footprint,
        "rasterLayer": INUNDATION_IMAGE_LAYER,
        "cacheStatus": status,
    });
    if let Some(warning) = warning {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warning));
        }
    }
    Ok(output)
}

fn combine_peak_storm_surge_catalog(
    points_result: Result<Value, StudioError>,
    lines_result: Result<Value, StudioError>,
    polygons_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let results = [&points_result, &lines_result, &polygons_result];
    let valid_count = results
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .filter(|value| is_feature_collection(value))
        .count();
    if valid_count == 0 {
        let errors = results
            .iter()
            .filter_map(|result| result.as_ref().err())
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        let detail = if errors.is_empty() {
            "all Peak Storm Surge layers returned invalid GeoJSON".to_string()
        } else {
            errors.join("; ")
        };
        return Err(StudioError::Provider(format!(
            "NHC Peak Storm Surge failed: {detail}"
        )));
    }

    let (status, mut failures) = combined_status(&results);
    let points = collection_or_failure("NHC Peak Storm Surge points", points_result, &mut failures);
    let lines = collection_or_failure("NHC Peak Storm Surge lines", lines_result, &mut failures);
    let polygons = collection_or_failure(
        "NHC Peak Storm Surge polygons",
        polygons_result,
        &mut failures,
    );

    let mut output = json!({
        "provider": "NOAA/NWS/NHC Peak Storm Surge",
        "product": "peak",
        "points": points,
        "lines": lines,
        "polygons": polygons,
        "cacheStatus": status,
    });
    if !failures.is_empty() {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(failures.join("; ")));
        }
    }
    Ok(output)
}

pub async fn tropical_storm_surge_catalog(
    product: &str,
    force: bool,
) -> Result<Value, StudioError> {
    match product.trim().to_ascii_lowercase().as_str() {
        "potential" => {
            let footprint = provider_client::fetch_json_cached(
                layer_query_url(INUNDATION_FOOTPRINT_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            combine_potential_storm_surge_catalog(footprint)
        }
        "peak" => {
            let points = provider_client::fetch_json_cached(
                peak_layer_query_url(PEAK_SURGE_POINTS_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            let lines = provider_client::fetch_json_cached(
                peak_layer_query_url(PEAK_SURGE_LINES_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            let polygons = provider_client::fetch_json_cached(
                peak_layer_query_url(PEAK_SURGE_POLYGONS_LAYER)?,
                TROPICAL_TTL_SECONDS,
                force,
                "application/geo+json,application/json",
            )
            .await;
            combine_peak_storm_surge_catalog(points, lines, polygons)
        }
        _ => Err(StudioError::Provider(
            "NHC storm-surge product must be potential or peak".to_string(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn collection(status: &str) -> Value {
        json!({ "type": "FeatureCollection", "features": [], "cacheStatus": status })
    }

    #[test]
    fn official_tropical_layers_are_geojson_queries() {
        for layer in [
            OUTLOOK_TWO_DAY_LOCATION_LAYER,
            OUTLOOK_SEVEN_DAY_LOCATION_LAYER,
            OUTLOOK_SEVEN_DAY_REGION_LAYER,
            FORECAST_POINTS_LAYER,
            FORECAST_TRACK_LAYER,
            FORECAST_CONE_LAYER,
            WATCH_WARNING_LAYER,
            OUTLOOK_SEVEN_DAY_MOTION_LAYER,
        ] {
            let url = layer_query_url(layer).unwrap();
            assert_eq!(url.host_str(), Some("mapservices.weather.noaa.gov"));
            assert!(url.as_str().contains("NHC_tropical_weather_summary"));
            assert!(url.as_str().contains("f=geojson"));
            assert!(url.as_str().contains("outSR=4326"));
        }
    }

    #[test]
    fn partial_tropical_layer_failure_is_degraded_not_fatal() {
        let result = combine_catalog(
            Ok(collection("live")),
            Ok(collection("live")),
            Ok(collection("live")),
            Err(StudioError::Provider("warning layer down".to_string())),
        )
        .unwrap();
        assert_eq!(result.get("cacheStatus").and_then(Value::as_str), Some("live"));
        assert!(result.get("cacheWarning").and_then(Value::as_str).is_some());
        assert_eq!(
            result
                .get("warnings")
                .and_then(|value| value.get("features"))
                .and_then(Value::as_array)
                .map(Vec::len),
            Some(0)
        );
    }

    #[test]
    fn all_structurally_invalid_tropical_layers_are_fatal() {
        let result = combine_catalog(
            Ok(json!({"error": "invalid"})),
            Ok(json!({"type": "FeatureCollection"})),
            Ok(json!({"features": []})),
            Ok(json!({})),
        );
        assert!(result.is_err());
    }

    #[test]
    fn two_day_outlook_requires_location_geojson() {
        let result = combine_two_day_outlook(Ok(json!({"error": "invalid"})));
        assert!(result.is_err());
        let valid = combine_two_day_outlook(Ok(collection("fresh-cache"))).unwrap();
        assert_eq!(valid.get("period").and_then(Value::as_str), Some("2day"));
        assert_eq!(valid.get("cacheStatus").and_then(Value::as_str), Some("fresh-cache"));
    }

    #[test]
    fn seven_day_outlook_partial_failure_is_degraded_not_fatal() {
        let result = combine_outlook_catalog(
            "7day",
            Ok(collection("live")),
            Ok(collection("live")),
            Err(StudioError::Provider("motion layer down".to_string())),
        )
        .unwrap();
        assert_eq!(result.get("period").and_then(Value::as_str), Some("7day"));
        assert!(result.get("cacheWarning").and_then(Value::as_str).is_some());
        assert_eq!(
            result
                .get("motion")
                .and_then(|value| value.get("features"))
                .and_then(Value::as_array)
                .map(Vec::len),
            Some(0)
        );
    }

    #[test]
    fn all_structurally_invalid_outlook_layers_are_fatal() {
        let result = combine_outlook_catalog(
            "7day",
            Ok(json!({"error": "invalid"})),
            Ok(json!({"type": "FeatureCollection"})),
            Ok(json!({})),
        );
        assert!(result.is_err());
    }


    #[test]
    fn official_arrival_time_layers_are_geojson_queries() {
        for (mode, layer) in [
            ("earliest", ARRIVAL_EARLIEST_LAYER),
            ("most-likely", ARRIVAL_MOST_LIKELY_LAYER),
        ] {
            assert_eq!(arrival_time_layer(mode).unwrap().0, layer);
            let url = layer_query_url(layer).unwrap();
            assert_eq!(url.host_str(), Some("mapservices.weather.noaa.gov"));
            assert!(url.as_str().contains("NHC_tropical_weather_summary"));
            assert!(url.as_str().contains("f=geojson"));
        }
        assert!(arrival_time_layer("unknown").is_err());
    }

    #[test]
    fn arrival_time_catalog_requires_geojson() {
        let invalid = combine_arrival_time_catalog(
            "earliest",
            Ok(json!({"error": "invalid"})),
        );
        assert!(invalid.is_err());
        let valid = combine_arrival_time_catalog(
            "most-likely",
            Ok(collection("fresh-cache")),
        )
        .unwrap();
        assert_eq!(valid.get("mode").and_then(Value::as_str), Some("most-likely"));
    }

    #[test]
    fn official_storm_surge_services_are_pinned() {
        let footprint = layer_query_url(INUNDATION_FOOTPRINT_LAYER).unwrap();
        assert!(footprint.as_str().contains("NHC_tropical_weather_summary"));
        assert!(footprint.as_str().contains("/23/query"));
        assert_eq!(INUNDATION_IMAGE_LAYER, 24);

        for layer in [
            PEAK_SURGE_POINTS_LAYER,
            PEAK_SURGE_LINES_LAYER,
            PEAK_SURGE_POLYGONS_LAYER,
        ] {
            let url = peak_layer_query_url(layer).unwrap();
            assert_eq!(url.host_str(), Some("mapservices.weather.noaa.gov"));
            assert!(url.as_str().contains("NHC_PeakStormSurge"));
            assert!(url.as_str().contains("f=geojson"));
        }
    }

    #[test]
    fn potential_storm_surge_requires_geojson() {
        assert!(combine_potential_storm_surge_catalog(
            Ok(json!({"error": "invalid"}))
        )
        .is_err());
        let valid = combine_potential_storm_surge_catalog(
            Ok(collection("fresh-cache"))
        )
        .unwrap();
        assert_eq!(valid.get("product").and_then(Value::as_str), Some("potential"));
        assert_eq!(valid.get("rasterLayer").and_then(Value::as_u64), Some(24));
    }

    #[test]
    fn peak_storm_surge_partial_failure_is_degraded_not_fatal() {
        let result = combine_peak_storm_surge_catalog(
            Ok(collection("live")),
            Ok(collection("live")),
            Err(StudioError::Provider("polygon layer down".to_string())),
        )
        .unwrap();
        assert_eq!(result.get("product").and_then(Value::as_str), Some("peak"));
        assert!(result.get("cacheWarning").and_then(Value::as_str).is_some());
    }

    #[test]
    fn official_wind_probability_layers_are_geojson_queries() {
        for (threshold, layer) in [
            (34, WIND_PROBABILITY_34_LAYER),
            (50, WIND_PROBABILITY_50_LAYER),
            (64, WIND_PROBABILITY_64_LAYER),
        ] {
            assert_eq!(wind_probability_layer(threshold).unwrap(), layer);
            let url = layer_query_url(layer).unwrap();
            assert_eq!(url.host_str(), Some("mapservices.weather.noaa.gov"));
            assert!(url.as_str().contains("NHC_tropical_weather_summary"));
            assert!(url.as_str().contains("f=geojson"));
            assert!(url.as_str().contains("outSR=4326"));
        }
    }

    #[test]
    fn invalid_wind_probability_threshold_is_rejected() {
        assert!(wind_probability_layer(35).is_err());
        assert!(wind_probability_layer(0).is_err());
    }

    #[test]
    fn wind_probability_catalog_requires_geojson() {
        let invalid = combine_wind_probability_catalog(34, Ok(json!({"error": "invalid"})));
        assert!(invalid.is_err());

        let valid = combine_wind_probability_catalog(64, Ok(collection("fresh-cache"))).unwrap();
        assert_eq!(valid.get("thresholdKnots").and_then(Value::as_u64), Some(64));
        assert_eq!(valid.get("cacheStatus").and_then(Value::as_str), Some("fresh-cache"));
    }
}
