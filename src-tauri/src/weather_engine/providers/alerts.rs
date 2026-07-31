use crate::{error::StudioError, weather_engine::provider_client};
use reqwest::Url;
use serde_json::{Map, Value};
use std::time::{SystemTime, UNIX_EPOCH};

const NWS_ALERTS_URL: &str = "https://api.weather.gov/alerts/active";

pub async fn active_alerts(force: bool) -> Result<Value, StudioError> {
    let url = Url::parse(NWS_ALERTS_URL).map_err(|error| StudioError::Url(error.to_string()))?;
    let mut data = provider_client::fetch_json_cached(
        url,
        60,
        force,
        "application/geo+json, application/json",
    )
    .await?;
    let generated_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let features = data
        .get_mut("features")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| StudioError::Provider(
            "NWS alert response did not contain a feature collection".to_string(),
        ))?;
    for (index, feature) in features.iter_mut().enumerate() {
        let object = feature.as_object_mut().ok_or_else(|| {
            StudioError::Provider("NWS alert feature was not a JSON object".to_string())
        })?;
        let object_id = object.get("id").and_then(Value::as_str).map(str::to_string);
        let id = {
            let properties = object
                .entry("properties")
                .or_insert_with(|| Value::Object(Map::new()))
                .as_object_mut()
                .ok_or_else(|| StudioError::Provider("NWS alert properties were invalid".to_string()))?;
            let id = object_id
                .or_else(|| properties.get("id").and_then(Value::as_str).map(str::to_string))
                .unwrap_or_else(|| format!("nws-alert-{index}"));
            properties.insert("ngwsId".to_string(), Value::String(id.clone()));
            id
        };
        object.insert("id".to_string(), Value::String(id));
    }
    if let Some(object) = data.as_object_mut() {
        object.insert("generatedAt".to_string(), Value::String(generated_at));
        object.insert("provider".to_string(), Value::String("National Weather Service API".to_string()));
    }
    Ok(data)
}
