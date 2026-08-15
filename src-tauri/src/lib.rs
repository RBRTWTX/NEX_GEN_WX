mod error;
mod storage;
mod weather_engine;

use serde::Serialize;
use serde_json::Value;
use weather_engine::providers::BBox;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    version: &'static str,
    workspace_ready: bool,
    export_directory: String,
    services: Vec<weather_engine::ServiceStatus>,
}

#[tauri::command]
fn engine_status() -> Result<EngineStatus, error::StudioError> {
    storage::ensure_directories()?;
    Ok(EngineStatus {
        version: env!("CARGO_PKG_VERSION"),
        workspace_ready: true,
        export_directory: storage::exports_dir().display().to_string(),
        services: weather_engine::initial_services(),
    })
}

#[tauri::command]
fn save_png(data_url: String, file_name: String) -> Result<String, error::StudioError> {
    let path = storage::save_png_data_url(&data_url, &file_name)?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn save_project(project: Value) -> Result<String, error::StudioError> {
    let path = storage::save_project_json(&project)?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn load_latest_project() -> Result<Option<Value>, error::StudioError> {
    storage::load_latest_project_json()
}

#[tauri::command]
async fn fetch_active_alerts(force: bool) -> Result<Value, error::StudioError> {
    weather_engine::providers::active_alerts(force).await
}

#[tauri::command]
async fn fetch_state_boundaries(force: bool) -> Result<Value, error::StudioError> {
    weather_engine::providers::state_boundaries(force).await
}

#[tauri::command]
async fn fetch_county_boundaries(
    bbox: BBox,
    zoom: f64,
    force: bool,
) -> Result<Value, error::StudioError> {
    weather_engine::providers::county_boundaries(bbox, zoom, force).await
}

#[tauri::command]
async fn fetch_places(
    bbox: BBox,
    zoom: f64,
    density: u8,
    force: bool,
) -> Result<Value, error::StudioError> {
    weather_engine::providers::places(bbox, zoom, density, force).await
}

#[tauri::command]
async fn fetch_roads(
    bbox: BBox,
    zoom: f64,
    density: u8,
    force: bool,
) -> Result<Value, error::StudioError> {
    weather_engine::providers::roads(bbox, zoom, density, force).await
}

#[tauri::command]
async fn fetch_surface_observations(
    bbox: BBox,
    zoom: f64,
    density: u8,
    mode: String,
    field: String,
    force: bool,
) -> Result<Value, error::StudioError> {
    weather_engine::providers::surface_observations(bbox, zoom, density, mode, field, force).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_| {
            storage::ensure_directories()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine_status,
            save_png,
            save_project,
            load_latest_project,
            fetch_active_alerts,
            fetch_state_boundaries,
            fetch_county_boundaries,
            fetch_places,
            fetch_roads,
            fetch_surface_observations
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEX GEN WX");
}
