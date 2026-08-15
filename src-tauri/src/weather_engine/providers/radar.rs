use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{json, Value};

const MRMS_SERVICE_URL: &str = "https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer";
const IEM_RADAR_URL: &str = "https://mesonet.agron.iastate.edu/json/radar.py";
const MRMS_TTL_SECONDS: u64 = 120;
const SITE_LOOKUP_TTL_SECONDS: u64 = 300;
const SITE_CATALOG_TTL_SECONDS: u64 = 90;
const SITE_PRODUCTS: [&str; 4] = ["N0B", "N0U", "N0S", "NET"];

fn cache_status(value: &Value) -> &str {
    value
        .get("cacheStatus")
        .and_then(Value::as_str)
        .unwrap_or("live")
}

fn cache_warning(value: &Value) -> Option<&str> {
    value.get("cacheWarning").and_then(Value::as_str)
}

fn combine_cache_metadata(values: &[&Value]) -> (String, Option<String>) {
    let status = if values.iter().any(|value| cache_status(value) == "stale") {
        "stale"
    } else if values.iter().all(|value| cache_status(value) == "fresh-cache") {
        "fresh-cache"
    } else {
        "live"
    };
    let warnings = values
        .iter()
        .filter_map(|value| cache_warning(value))
        .map(str::trim)
        .filter(|warning| !warning.is_empty())
        .collect::<Vec<_>>();
    let warning = (!warnings.is_empty()).then(|| warnings.join("; "));
    (status.to_string(), warning)
}

fn assemble_mrms_catalog(
    metadata_result: Result<Value, StudioError>,
    query_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let mut failures = Vec::new();
    let (metadata, metadata_available) = match metadata_result {
        Ok(value) => (value, true),
        Err(error) => {
            failures.push(format!("MRMS metadata endpoint unavailable: {error}"));
            (json!({}), false)
        }
    };
    let (query, query_available) = match query_result {
        Ok(value) => (value, true),
        Err(error) => {
            failures.push(format!("MRMS frame-query endpoint unavailable: {error}"));
            (json!({}), false)
        }
    };

    if !metadata_available && !query_available {
        return Err(StudioError::Provider(format!(
            "NOAA MRMS catalog failed: {}",
            failures.join("; ")
        )));
    }

    let mut successful_values = Vec::new();
    if metadata_available {
        successful_values.push(&metadata);
    }
    if query_available {
        successful_values.push(&query);
    }
    let (cache_status, cache_warning) = combine_cache_metadata(&successful_values);
    let mut warnings = Vec::new();
    if let Some(warning) = cache_warning {
        warnings.push(warning);
    }
    warnings.extend(failures);

    let mut output = json!({
        "provider": "NOAA MRMS ImageServer",
        "metadata": metadata,
        "query": query,
        "cacheStatus": cache_status,
    });
    if !warnings.is_empty() {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warnings.join("; ")));
        }
    }
    Ok(output)
}

fn normalize_site(site: &str) -> Result<String, StudioError> {
    let mut value = site.trim().to_ascii_uppercase();
    if value.len() == 4 && value.starts_with('K') {
        value.remove(0);
    }
    if !(value.len() == 3 || value.len() == 4)
        || !value.chars().all(|character| character.is_ascii_alphanumeric())
    {
        return Err(StudioError::Provider(
            "NEXRAD site identifiers must contain three or four letters/numbers".to_string(),
        ));
    }
    Ok(value)
}

fn normalize_product(product: &str) -> Result<String, StudioError> {
    let value = product.trim().to_ascii_uppercase();
    if !SITE_PRODUCTS.contains(&value.as_str()) {
        return Err(StudioError::Provider(format!(
            "Unsupported single-site radar product: {value}"
        )));
    }
    Ok(value)
}

fn validate_coordinate(latitude: f64, longitude: f64) -> Result<(), StudioError> {
    if !latitude.is_finite() || !(-90.0..=90.0).contains(&latitude) {
        return Err(StudioError::Provider("Radar latitude is outside -90 to 90".to_string()));
    }
    if !longitude.is_finite() || !(-180.0..=180.0).contains(&longitude) {
        return Err(StudioError::Provider("Radar longitude is outside -180 to 180".to_string()));
    }
    Ok(())
}

fn validate_utc_minute(value: &str, label: &str) -> Result<String, StudioError> {
    let candidate = value.trim();
    let bytes = candidate.as_bytes();
    let valid_shape = bytes.len() == 17
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b'Z'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7 | 10 | 13 | 16) || byte.is_ascii_digit());
    if !valid_shape {
        return Err(StudioError::Provider(format!(
            "{label} must use UTC format YYYY-MM-DDTHH:MMZ"
        )));
    }
    Ok(candidate.to_string())
}

fn mrms_metadata_url() -> Result<Url, StudioError> {
    let mut url = Url::parse(MRMS_SERVICE_URL).map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut().append_pair("f", "pjson");
    Ok(url)
}

fn mrms_query_url() -> Result<Url, StudioError> {
    let mut url = Url::parse(&format!("{MRMS_SERVICE_URL}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("outFields", "idp_validtime,idp_validendtime")
        .append_pair("returnGeometry", "false")
        .append_pair("orderByFields", "idp_validtime ASC")
        .append_pair("f", "json");
    Ok(url)
}

fn radar_sites_url(latitude: f64, longitude: f64, timestamp: &str) -> Result<Url, StudioError> {
    validate_coordinate(latitude, longitude)?;
    let timestamp = validate_utc_minute(timestamp, "Radar lookup time")?;
    let mut url = Url::parse(IEM_RADAR_URL).map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("operation", "available")
        .append_pair("lat", &format!("{latitude:.5}"))
        .append_pair("lon", &format!("{longitude:.5}"))
        .append_pair("start", &timestamp);
    Ok(url)
}

fn radar_catalog_url(
    site: &str,
    product_code: &str,
    start: &str,
    end: &str,
) -> Result<Url, StudioError> {
    let site = normalize_site(site)?;
    let product = normalize_product(product_code)?;
    let start = validate_utc_minute(start, "Radar catalog start time")?;
    let end = validate_utc_minute(end, "Radar catalog end time")?;
    if start > end {
        return Err(StudioError::Provider(
            "Radar catalog start time must not be after the end time".to_string(),
        ));
    }
    let mut url = Url::parse(IEM_RADAR_URL).map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("operation", "list")
        .append_pair("radar", &site)
        .append_pair("product", &product)
        .append_pair("start", &start)
        .append_pair("end", &end);
    Ok(url)
}

pub async fn mrms_catalog(force: bool) -> Result<Value, StudioError> {
    let metadata = provider_client::fetch_json_cached(
        mrms_metadata_url()?,
        MRMS_TTL_SECONDS,
        force,
        "application/json",
    )
    .await;
    let query = provider_client::fetch_json_cached(
        mrms_query_url()?,
        MRMS_TTL_SECONDS,
        force,
        "application/json",
    )
    .await;
    assemble_mrms_catalog(metadata, query)
}

pub async fn radar_sites(
    latitude: f64,
    longitude: f64,
    timestamp: String,
    force: bool,
) -> Result<Value, StudioError> {
    provider_client::fetch_json_cached(
        radar_sites_url(latitude, longitude, &timestamp)?,
        SITE_LOOKUP_TTL_SECONDS,
        force,
        "application/json",
    )
    .await
}

pub async fn radar_site_catalog(
    site: String,
    product_code: String,
    start: String,
    end: String,
    force: bool,
) -> Result<Value, StudioError> {
    provider_client::fetch_json_cached(
        radar_catalog_url(&site, &product_code, &start, &end)?,
        SITE_CATALOG_TTL_SECONDS,
        force,
        "application/json",
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn site_identifiers_are_normalized_without_guessing() {
        assert_eq!(normalize_site("KEWX").unwrap(), "EWX");
        assert_eq!(normalize_site("grk").unwrap(), "GRK");
        assert!(normalize_site("EWX!").is_err());
    }

    #[test]
    fn radar_products_are_explicitly_whitelisted() {
        for product in SITE_PRODUCTS {
            assert_eq!(normalize_product(product).unwrap(), product);
        }
        assert!(normalize_product("N0Q").is_err());
        assert!(normalize_product("../../etc").is_err());
    }

    #[test]
    fn site_catalog_url_uses_documented_iem_parameters() {
        let url = radar_catalog_url(
            "KEWX",
            "N0B",
            "2026-07-26T18:00Z",
            "2026-07-26T20:00Z",
        )
        .unwrap();
        let value = url.as_str();
        assert!(value.contains("operation=list"));
        assert!(value.contains("radar=EWX"));
        assert!(value.contains("product=N0B"));
        assert!(value.contains("start=2026-07-26T18%3A00Z"));
        assert!(value.contains("end=2026-07-26T20%3A00Z"));
    }

    #[test]
    fn mrms_catalog_degrades_when_only_one_endpoint_is_available() {
        let output = assemble_mrms_catalog(
            Ok(json!({ "timeInfo": { "timeExtent": [1, 2] }, "cacheStatus": "live" })),
            Err(StudioError::Provider("query offline".to_string())),
        )
        .unwrap();
        assert!(output.get("metadata").and_then(Value::as_object).is_some());
        assert_eq!(output.get("query"), Some(&json!({})));
        assert!(output
            .get("cacheWarning")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .contains("frame-query endpoint unavailable"));
    }

    #[test]
    fn mrms_catalog_fails_only_when_both_endpoints_fail() {
        let result = assemble_mrms_catalog(
            Err(StudioError::Provider("metadata offline".to_string())),
            Err(StudioError::Provider("query offline".to_string())),
        );
        assert!(result.is_err());
    }

    #[test]
    fn invalid_coordinates_and_time_ranges_are_rejected() {
        assert!(radar_sites_url(100.0, -98.0, "2026-07-26T20:00Z").is_err());
        assert!(radar_sites_url(29.0, -181.0, "2026-07-26T20:00Z").is_err());
        assert!(radar_catalog_url("EWX", "N0B", "bad", "2026-07-26T20:00Z").is_err());
        assert!(radar_catalog_url(
            "EWX",
            "N0B",
            "2026-07-26T21:00Z",
            "2026-07-26T20:00Z"
        )
        .is_err());
    }
}
