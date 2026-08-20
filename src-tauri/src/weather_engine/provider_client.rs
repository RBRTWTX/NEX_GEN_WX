use crate::{error::StudioError, storage};
use reqwest::{header::{RANGE, RETRY_AFTER}, Client, StatusCode, Url};
use serde_json::Value;
use std::{sync::OnceLock, time::Duration};
use tokio::time::sleep;

const MAX_ATTEMPTS: usize = 3;
const DEFAULT_RETRY_DELAY: Duration = Duration::from_millis(650);
static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn client() -> Result<&'static Client, StudioError> {
    if let Some(client) = HTTP_CLIENT.get() {
        return Ok(client);
    }
    let value = Client::builder()
        .connect_timeout(Duration::from_secs(12))
        .timeout(Duration::from_secs(35))
        .pool_idle_timeout(Duration::from_secs(90))
        .user_agent("NEX-GEN-WX/0.8.5 (+https://github.com/RBRTWTX/NEX_GEN_WX)")
        .build()?;
    let _ = HTTP_CLIENT.set(value);
    HTTP_CLIENT
        .get()
        .ok_or_else(|| StudioError::Provider("HTTP client could not initialize".to_string()))
}

fn retry_delay(headers: &reqwest::header::HeaderMap, attempt: usize) -> Duration {
    let retry_after = headers
        .get(RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|seconds| Duration::from_secs(seconds.min(10)));
    retry_after.unwrap_or_else(|| DEFAULT_RETRY_DELAY * attempt as u32)
}

fn provider_message(value: &Value) -> Option<String> {
    value
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|message| !message.is_empty())
        .map(str::to_string)
}

fn annotate_cache(mut value: Value, status: &str, warning: Option<&str>) -> Value {
    if let Some(object) = value.as_object_mut() {
        object.insert("cacheStatus".to_string(), Value::String(status.to_string()));
        if let Some(warning) = warning {
            object.insert("cacheWarning".to_string(), Value::String(warning.to_string()));
        } else {
            object.remove("cacheWarning");
        }
    }
    value
}

fn clean_status_error(status: StatusCode, body: &str) -> StudioError {
    let compact = body.split_whitespace().collect::<Vec<_>>().join(" ");
    let detail = if compact.is_empty() {
        status.canonical_reason().unwrap_or("provider request failed").to_string()
    } else {
        compact.chars().take(240).collect()
    };
    StudioError::Provider(format!("HTTP {}: {}", status.as_u16(), detail))
}

pub async fn fetch_bytes(url: Url, accept: &str) -> Result<Vec<u8>, StudioError> {
    let mut last_error: Option<StudioError> = None;
    for attempt in 1..=MAX_ATTEMPTS {
        match client()?.get(url.clone()).header("Accept", accept).send().await {
            Ok(response) => {
                let status = response.status();
                let headers = response.headers().clone();
                if status.is_success() {
                    return Ok(response.bytes().await?.to_vec());
                }
                let body = response.text().await.unwrap_or_default();
                let error = clean_status_error(status, &body);
                let retryable = status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error();
                last_error = Some(error);
                if !retryable || attempt == MAX_ATTEMPTS {
                    break;
                }
                sleep(retry_delay(&headers, attempt)).await;
            }
            Err(error) => {
                let retryable = error.is_timeout() || error.is_connect() || error.is_request();
                last_error = Some(StudioError::Request(error));
                if !retryable || attempt == MAX_ATTEMPTS {
                    break;
                }
                sleep(DEFAULT_RETRY_DELAY * attempt as u32).await;
            }
        }
    }
    Err(last_error.unwrap_or_else(|| StudioError::Provider("provider request failed".to_string())))
}

pub async fn fetch_bytes_range(
    url: Url,
    start: u64,
    end: u64,
    accept: &str,
) -> Result<Vec<u8>, StudioError> {
    if end < start {
        return Err(StudioError::Provider("invalid provider byte range".to_string()));
    }
    let range = format!("bytes={start}-{end}");
    let mut last_error: Option<StudioError> = None;
    for attempt in 1..=MAX_ATTEMPTS {
        match client()?
            .get(url.clone())
            .header("Accept", accept)
            .header(RANGE, range.clone())
            .send()
            .await
        {
            Ok(response) => {
                let status = response.status();
                let headers = response.headers().clone();
                if status == StatusCode::PARTIAL_CONTENT {
                    return Ok(response.bytes().await?.to_vec());
                }
                if status.is_success() {
                    return Err(StudioError::Provider(
                        "provider ignored the requested byte range; refusing full-object model download".to_string(),
                    ));
                }
                let body = response.text().await.unwrap_or_default();
                let error = clean_status_error(status, &body);
                let retryable = status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error();
                last_error = Some(error);
                if !retryable || attempt == MAX_ATTEMPTS {
                    break;
                }
                sleep(retry_delay(&headers, attempt)).await;
            }
            Err(error) => {
                let retryable = error.is_timeout() || error.is_connect() || error.is_request();
                last_error = Some(StudioError::Request(error));
                if !retryable || attempt == MAX_ATTEMPTS {
                    break;
                }
                sleep(DEFAULT_RETRY_DELAY * attempt as u32).await;
            }
        }
    }
    Err(last_error.unwrap_or_else(|| StudioError::Provider("provider byte-range request failed".to_string())))
}

pub async fn fetch_json_cached(
    url: Url,
    ttl_seconds: u64,
    force: bool,
    accept: &str,
) -> Result<Value, StudioError> {
    let key = url.as_str().to_string();
    if !force {
        if let Some(value) = storage::read_cached_json(&key)? {
            return Ok(annotate_cache(value, "fresh-cache", None));
        }
    }
    let stale = storage::read_cached_json_allow_expired(&key)?;
    let result: Result<Value, StudioError> = async {
        let bytes = fetch_bytes(url, accept).await?;
        let value: Value = serde_json::from_slice(&bytes)?;
        if let Some(message) = provider_message(&value) {
            return Err(StudioError::Provider(message));
        }
        Ok(value)
    }
    .await;
    match result {
        Ok(value) => {
            storage::write_cached_json(&key, ttl_seconds, &value)?;
            Ok(annotate_cache(value, "live", None))
        }
        Err(error) => stale
            .map(|value| annotate_cache(value, "stale", Some(&format!("Live provider request failed: {error}"))))
            .ok_or(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn arcgis_error_messages_are_normalized_before_reaching_the_operator() {
        let value = json!({ "error": { "message": "Invalid or missing input parameters." } });
        assert_eq!(provider_message(&value).as_deref(), Some("Invalid or missing input parameters."));
    }

    #[test]
    fn cache_metadata_is_predictable() {
        let value = annotate_cache(json!({ "type": "FeatureCollection", "features": [] }), "stale", Some("offline"));
        assert_eq!(value.get("cacheStatus").and_then(Value::as_str), Some("stale"));
        assert_eq!(value.get("cacheWarning").and_then(Value::as_str), Some("offline"));
    }
}
