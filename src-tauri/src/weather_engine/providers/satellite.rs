use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{json, Value};

const NOAA_GEOCOLOR_URL: &str =
    "https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/MERGEDGC_Last_24hr/ImageServer";
const SATELLITE_TTL_SECONDS: u64 = 60;

fn metadata_url() -> Result<Url, StudioError> {
    let mut url = Url::parse(NOAA_GEOCOLOR_URL)
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut().append_pair("f", "pjson");
    Ok(url)
}

fn query_url() -> Result<Url, StudioError> {
    let mut url = Url::parse(&format!("{NOAA_GEOCOLOR_URL}/query"))
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("where", "1=1")
        .append_pair("outFields", "Start_Time,End_Time")
        .append_pair("returnGeometry", "false")
        .append_pair("orderByFields", "Start_Time ASC")
        .append_pair("f", "json");
    Ok(url)
}

fn cache_status(value: &Value) -> &str {
    value
        .get("cacheStatus")
        .and_then(Value::as_str)
        .unwrap_or("live")
}

fn cache_warning(value: &Value) -> Option<&str> {
    value.get("cacheWarning").and_then(Value::as_str)
}

fn combine_catalog(
    metadata_result: Result<Value, StudioError>,
    query_result: Result<Value, StudioError>,
) -> Result<Value, StudioError> {
    let mut failures = Vec::new();
    let metadata = match metadata_result {
        Ok(value) => value,
        Err(error) => {
            failures.push(format!("GeoColor metadata endpoint unavailable: {error}"));
            json!({})
        }
    };
    let query = match query_result {
        Ok(value) => value,
        Err(error) => {
            failures.push(format!("GeoColor time query unavailable: {error}"));
            json!({})
        }
    };

    if metadata.as_object().is_some_and(|value| value.is_empty())
        && query.as_object().is_some_and(|value| value.is_empty())
    {
        return Err(StudioError::Provider(format!(
            "NOAA/NESDIS GeoColor catalog failed: {}",
            failures.join("; ")
        )));
    }

    let statuses = [&metadata, &query]
        .iter()
        .filter(|value| !value.as_object().is_some_and(|object| object.is_empty()))
        .map(|value| cache_status(value))
        .collect::<Vec<_>>();
    let status = if statuses.iter().any(|value| *value == "stale") {
        "stale"
    } else if !statuses.is_empty() && statuses.iter().all(|value| *value == "fresh-cache") {
        "fresh-cache"
    } else {
        "live"
    };

    let mut warnings = [&metadata, &query]
        .iter()
        .filter_map(|value| cache_warning(value))
        .map(str::to_string)
        .collect::<Vec<_>>();
    warnings.extend(failures);

    let mut output = json!({
        "provider": "NOAA/NESDIS MERGEDGC_Last_24hr",
        "metadata": metadata,
        "query": query,
        "cacheStatus": status,
    });
    if !warnings.is_empty() {
        if let Some(object) = output.as_object_mut() {
            object.insert("cacheWarning".to_string(), Value::String(warnings.join("; ")));
        }
    }
    Ok(output)
}

pub async fn satellite_catalog(force: bool) -> Result<Value, StudioError> {
    let metadata = provider_client::fetch_json_cached(
        metadata_url()?,
        SATELLITE_TTL_SECONDS,
        force,
        "application/json",
    )
    .await;
    let query = provider_client::fetch_json_cached(
        query_url()?,
        SATELLITE_TTL_SECONDS,
        force,
        "application/json",
    )
    .await;
    combine_catalog(metadata, query)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn geocolor_catalog_is_scoped_to_official_noaa_nesdis_service() {
        let metadata = metadata_url().unwrap();
        let query = query_url().unwrap();
        assert_eq!(metadata.host_str(), Some("satellitemaps.nesdis.noaa.gov"));
        assert!(metadata.as_str().contains("MERGEDGC_Last_24hr"));
        assert!(query.as_str().contains("/query"));
        assert!(query.as_str().contains("Start_Time"));
    }

    #[test]
    fn partial_geocolor_catalog_failure_is_degraded_not_fatal() {
        let result = combine_catalog(
            Ok(json!({"cacheStatus": "live", "timeInfo": {}})),
            Err(StudioError::Provider("query down".to_string())),
        )
        .unwrap();
        assert_eq!(result.get("cacheStatus").and_then(Value::as_str), Some("live"));
        assert!(result.get("cacheWarning").and_then(Value::as_str).is_some());
    }
}