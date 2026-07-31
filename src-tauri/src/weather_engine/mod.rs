pub mod provider_client;
pub mod providers;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub id: &'static str,
    pub state: &'static str,
    pub detail: &'static str,
}

pub fn initial_services() -> Vec<ServiceStatus> {
    vec![
        ServiceStatus { id: "scene-engine", state: "ready", detail: "Schema 5 project persistence, recovery and immutable scene state ready" },
        ServiceStatus { id: "export-engine", state: "ready", detail: "PNG filesystem command available" },
        ServiceStatus { id: "weather-data", state: "ready", detail: "Hardened Rust HTTP adapters, retries, rate-limit handling and disk cache ready" },
        ServiceStatus { id: "boundaries", state: "ready", detail: "Current Census state/county adapter with independent failure isolation ready" },
        ServiceStatus { id: "cities", state: "ready", detail: "Current Census place/CDP adapter with partial-result recovery ready" },
        ServiceStatus { id: "roads", state: "ready", detail: "Basemap road classification and density controls ready" },
        ServiceStatus { id: "alerts", state: "ready", detail: "Active NWS alert feed and geometry renderer ready" },
        ServiceStatus { id: "observations", state: "ready", detail: "NOAA AWC METAR ingestion, normalization and station thinning ready" },
        ServiceStatus { id: "temperature", state: "ready", detail: "Current temperature, dew point, humidity and derived-field analysis ready" },
        ServiceStatus { id: "radar", state: "idle", detail: "R3 adapter inventory complete" },
        ServiceStatus { id: "satellite", state: "idle", detail: "R3 adapter inventory complete" },
    ]
}
