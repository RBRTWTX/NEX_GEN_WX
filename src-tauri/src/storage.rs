use crate::error::StudioError;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CacheEnvelope {
    expires_at_ms: u128,
    data: Value,
}

fn safe_name(input: &str, fallback: &str) -> String {
    let sanitized: String = input
        .chars()
        .filter(|value| value.is_ascii_alphanumeric() || matches!(value, ' ' | '_' | '-' | '.'))
        .take(120)
        .collect();
    let sanitized = sanitized.trim().replace(' ', "_");
    if sanitized.is_empty() {
        fallback.to_string()
    } else {
        sanitized
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), StudioError> {
    let temporary = path.with_extension(format!(
        "{}.tmp",
        path.extension().and_then(|value| value.to_str()).unwrap_or("data")
    ));
    fs::write(&temporary, bytes)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(temporary, path)?;
    Ok(())
}

fn local_data_root() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn legacy_workspace_root() -> PathBuf {
    local_data_root().join("NextGen Weather Studio")
}

fn legacy_projects_dir() -> PathBuf {
    legacy_workspace_root().join("projects")
}

fn cache_file(key: &str) -> PathBuf {
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    workspace_root()
        .join("cache")
        .join(format!("{:016x}.json", hasher.finish()))
}

pub fn workspace_root() -> PathBuf {
    local_data_root().join("NEX GEN WX")
}

pub fn exports_dir() -> PathBuf {
    dirs::picture_dir()
        .unwrap_or_else(workspace_root)
        .join("NEX GEN WX Exports")
}

pub fn projects_dir() -> PathBuf {
    workspace_root().join("projects")
}

pub fn ensure_directories() -> Result<(), StudioError> {
    fs::create_dir_all(exports_dir())?;
    fs::create_dir_all(projects_dir())?;
    fs::create_dir_all(workspace_root().join("cache"))?;
    Ok(())
}

pub fn save_png_data_url(data_url: &str, file_name: &str) -> Result<PathBuf, StudioError> {
    let encoded = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or(StudioError::InvalidPng)?;
    let bytes = STANDARD.decode(encoded)?;
    if !bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Err(StudioError::InvalidPng);
    }
    fs::create_dir_all(exports_dir())?;
    let name = safe_name(file_name, "weather_scene.png");
    let name = if name.to_ascii_lowercase().ends_with(".png") {
        name
    } else {
        format!("{name}.png")
    };
    let path = exports_dir().join(name);
    fs::write(&path, bytes)?;
    Ok(path)
}

pub fn save_project_json(project: &Value) -> Result<PathBuf, StudioError> {
    fs::create_dir_all(projects_dir())?;
    let id = project
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("project");
    // New project files use the NEX GEN WX extension; the loader still accepts legacy NGWS files.
    let path = projects_dir().join(format!("{}.nexgenwx.json", safe_name(id, "project")));
    let content = serde_json::to_vec_pretty(project)?;
    write_atomic(&path, &content)?;
    Ok(path)
}

fn project_candidates(directory: &Path) -> Vec<(SystemTime, PathBuf)> {
    if !directory.exists() {
        return Vec::new();
    }
    fs::read_dir(directory)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.ends_with(".ngws.json") || name.ends_with(".nexgenwx.json"))
                .unwrap_or(false)
        })
        .filter_map(|entry| {
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, entry.path()))
        })
        .collect()
}

pub fn load_latest_project_json() -> Result<Option<Value>, StudioError> {
    fs::create_dir_all(projects_dir())?;
    let mut candidates = project_candidates(&projects_dir());
    // Read-only legacy fallback prevents the 0.5.0 rename from hiding a user's existing project.
    candidates.extend(project_candidates(&legacy_projects_dir()));
    candidates.sort_by(|left, right| right.0.cmp(&left.0));
    for (_, path) in candidates {
        let content = match fs::read(&path) {
            Ok(content) => content,
            Err(_) => continue,
        };
        match serde_json::from_slice(&content) {
            Ok(project) => return Ok(Some(project)),
            Err(_) => {
                // Only remove corrupt files from the active NEX GEN WX workspace.
                if path.starts_with(workspace_root()) {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }
    Ok(None)
}

fn read_cache_envelope(key: &str) -> Result<Option<CacheEnvelope>, StudioError> {
    let path = cache_file(key);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read(&path)?;
    match serde_json::from_slice(&content) {
        Ok(envelope) => Ok(Some(envelope)),
        Err(_) => {
            let _ = fs::remove_file(path);
            Ok(None)
        }
    }
}

pub fn read_cached_json(key: &str) -> Result<Option<Value>, StudioError> {
    let Some(envelope) = read_cache_envelope(key)? else {
        return Ok(None);
    };
    if envelope.expires_at_ms <= now_ms() {
        return Ok(None);
    }
    Ok(Some(envelope.data))
}

pub fn read_cached_json_allow_expired(key: &str) -> Result<Option<Value>, StudioError> {
    Ok(read_cache_envelope(key)?.map(|envelope| envelope.data))
}

pub fn write_cached_json(key: &str, ttl_seconds: u64, data: &Value) -> Result<(), StudioError> {
    fs::create_dir_all(workspace_root().join("cache"))?;
    let envelope = CacheEnvelope {
        expires_at_ms: now_ms() + u128::from(ttl_seconds) * 1000,
        data: data.clone(),
    };
    let path = cache_file(key);
    let content = serde_json::to_vec(&envelope)?;
    write_atomic(&path, &content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::safe_name;

    #[test]
    fn file_names_are_sanitized() {
        assert_eq!(safe_name("My: Forecast / Scene", "fallback"), "My_Forecast__Scene");
        assert_eq!(safe_name("***", "fallback"), "fallback");
    }
}
