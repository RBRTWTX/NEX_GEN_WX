use crate::{error::StudioError, storage, weather_engine::provider_client};
use csv::{ReaderBuilder, StringRecord};
use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, io::Read, time::{SystemTime, UNIX_EPOCH}};

use super::types::BBox;

const AWC_METAR_CACHE_URL: &str = "https://aviationweather.gov/data/cache/metars.cache.csv.gz";
const AWC_METAR_CACHE_KEY: &str = "awc-current-metars-normalized-v2";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SurfaceObservation {
    station: String,
    latitude: f64,
    longitude: f64,
    observed: String,
    raw: String,
    temp_f: Option<f64>,
    dewpoint_f: Option<f64>,
    relative_humidity: Option<f64>,
    heat_index_f: Option<f64>,
    wind_chill_f: Option<f64>,
    wind_mph: Option<f64>,
    gust_mph: Option<f64>,
    wind_direction: Option<f64>,
    visibility_mi: Option<f64>,
    altimeter_in_hg: Option<f64>,
    weather: String,
    flight_category: String,
}

fn parse_number(value: Option<&str>) -> Option<f64> {
    let value = value?.trim();
    if value.is_empty() || value == "M" {
        return None;
    }
    let normalized = value.trim_start_matches(|character| character == '<' || character == '>').trim_end_matches('+');
    if let Some((whole, fraction)) = normalized.split_once(' ') {
        let whole = whole.parse::<f64>().ok()?;
        let (numerator, denominator) = fraction.split_once('/')?;
        let fraction = numerator.parse::<f64>().ok()? / denominator.parse::<f64>().ok()?;
        return (whole + fraction).is_finite().then_some(whole + fraction);
    }
    if let Some((numerator, denominator)) = normalized.split_once('/') {
        let number = numerator.parse::<f64>().ok()? / denominator.parse::<f64>().ok()?;
        return number.is_finite().then_some(number);
    }
    normalized.parse::<f64>().ok().filter(|number| number.is_finite())
}

fn csv_value<'a>(
    record: &'a StringRecord,
    header_index: &HashMap<String, usize>,
    names: &[&str],
) -> Option<&'a str> {
    names.iter().find_map(|name| {
        header_index
            .get(&name.to_ascii_lowercase())
            .and_then(|index| record.get(*index))
    })
}

fn celsius_to_fahrenheit(value: Option<f64>) -> Option<f64> {
    value.map(|value| value * 9.0 / 5.0 + 32.0)
}

fn knots_to_mph(value: Option<f64>) -> Option<f64> {
    value.map(|value| value * 1.150_779_448)
}

fn raw_wind_components(raw: &str) -> (Option<f64>, Option<f64>, Option<f64>) {
    for token in raw.split_whitespace() {
        let Some(body) = token.strip_suffix("KT") else {
            continue;
        };
        if body.len() < 5 {
            continue;
        }
        let (direction, speeds) = if let Some(rest) = body.strip_prefix("VRB") {
            (None, rest)
        } else {
            let Some(direction_text) = body.get(0..3) else {
                continue;
            };
            let Ok(direction) = direction_text.parse::<f64>() else {
                continue;
            };
            (Some(direction), &body[3..])
        };
        let mut parts = speeds.splitn(2, 'G');
        let speed = parts.next().and_then(|value| value.parse::<f64>().ok());
        let gust = parts.next().and_then(|value| value.parse::<f64>().ok());
        if speed.is_some() {
            return (direction, speed, gust);
        }
    }
    (None, None, None)
}

fn relative_humidity_percent(temp_c: Option<f64>, dewpoint_c: Option<f64>) -> Option<f64> {
    let (temperature, dewpoint) = (temp_c?, dewpoint_c?);
    let saturation = (17.625 * temperature / (243.04 + temperature)).exp();
    let actual = (17.625 * dewpoint / (243.04 + dewpoint)).exp();
    Some((100.0 * actual / saturation).clamp(0.0, 100.0))
}

fn heat_index_fahrenheit(temp_f: Option<f64>, humidity: Option<f64>) -> Option<f64> {
    let (temperature, humidity) = (temp_f?, humidity?);
    if temperature < 80.0 || humidity < 40.0 {
        return None;
    }
    let mut value = -42.379
        + 2.049_015_23 * temperature
        + 10.143_331_27 * humidity
        - 0.224_755_41 * temperature * humidity
        - 0.006_837_83 * temperature * temperature
        - 0.054_817_17 * humidity * humidity
        + 0.001_228_74 * temperature * temperature * humidity
        + 0.000_852_82 * temperature * humidity * humidity
        - 0.000_001_99 * temperature * temperature * humidity * humidity;
    if humidity < 13.0 && (80.0..=112.0).contains(&temperature) {
        value -= ((13.0 - humidity) / 4.0)
            * ((17.0 - (temperature - 95.0).abs()) / 17.0).max(0.0).sqrt();
    } else if humidity > 85.0 && (80.0..=87.0).contains(&temperature) {
        value += ((humidity - 85.0) / 10.0) * ((87.0 - temperature) / 5.0);
    }
    Some(value)
}

fn wind_chill_fahrenheit(temp_f: Option<f64>, wind_mph: Option<f64>) -> Option<f64> {
    let (temperature, wind) = (temp_f?, wind_mph?);
    if temperature > 50.0 || wind <= 3.0 {
        return None;
    }
    let speed = wind.powf(0.16);
    Some(35.74 + 0.6215 * temperature - 35.75 * speed + 0.4275 * temperature * speed)
}

fn parse_metar_csv_text(text: &str) -> Result<Vec<SurfaceObservation>, StudioError> {
    let lines = text.lines().collect::<Vec<_>>();
    let header_index = lines
        .iter()
        .position(|line| {
            let normalized = line.to_ascii_lowercase();
            normalized.contains("latitude")
                && normalized.contains("longitude")
                && (normalized.contains("station_id") || normalized.contains("icao_id"))
        })
        .ok_or_else(|| StudioError::Provider(
            "Aviation Weather Center METAR cache did not include a recognized CSV header".to_string(),
        ))?;
    let csv_text = lines[header_index..].join("\n");
    let mut reader = ReaderBuilder::new().flexible(true).from_reader(csv_text.as_bytes());
    let headers = reader.headers()?.clone();
    let header_map = headers
        .iter()
        .enumerate()
        .map(|(index, name)| (name.trim().to_ascii_lowercase(), index))
        .collect::<HashMap<_, _>>();
    let mut output = Vec::new();
    for result in reader.records() {
        let record = result?;
        let latitude = parse_number(csv_value(&record, &header_map, &["latitude", "lat"]));
        let longitude = parse_number(csv_value(&record, &header_map, &["longitude", "lon"]));
        let (Some(latitude), Some(longitude)) = (latitude, longitude) else {
            continue;
        };
        let station = csv_value(&record, &header_map, &["station_id", "icao_id", "station"])
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("UNKNOWN")
            .to_ascii_uppercase();
        if station == "UNKNOWN" {
            continue;
        }
        let raw = csv_value(&record, &header_map, &["raw_text", "raw_ob", "raw"])
            .unwrap_or_default()
            .trim()
            .to_string();
        let (raw_wind_direction, raw_wind_speed, raw_wind_gust) = raw_wind_components(&raw);
        let temp_c = parse_number(csv_value(&record, &header_map, &["temp_c", "temp", "temperature_c"]));
        let dewpoint_c = parse_number(csv_value(&record, &header_map, &["dewpoint_c", "dewp_c", "dewpoint"]));
        let temp_f = celsius_to_fahrenheit(temp_c);
        let dewpoint_f = celsius_to_fahrenheit(dewpoint_c);
        let relative_humidity = relative_humidity_percent(temp_c, dewpoint_c);
        let wind_speed_kt = parse_number(csv_value(
            &record,
            &header_map,
            &["wind_speed_kt", "wind_speed", "wspd"],
        ))
        .or(raw_wind_speed);
        let wind_gust_kt = parse_number(csv_value(
            &record,
            &header_map,
            &["wind_gust_kt", "wind_gust", "wgst"],
        ))
        .or(raw_wind_gust);
        let wind_mph = knots_to_mph(wind_speed_kt);
        let gust_mph = knots_to_mph(wind_gust_kt);
        output.push(SurfaceObservation {
            station,
            latitude,
            longitude,
            observed: csv_value(
                &record,
                &header_map,
                &["observation_time", "obs_time", "report_time"],
            )
            .unwrap_or_default()
            .trim()
            .to_string(),
            raw,
            temp_f,
            dewpoint_f,
            relative_humidity,
            heat_index_f: heat_index_fahrenheit(temp_f, relative_humidity),
            wind_chill_f: wind_chill_fahrenheit(temp_f, wind_mph),
            wind_mph,
            gust_mph,
            wind_direction: parse_number(csv_value(
                &record,
                &header_map,
                &["wind_dir_degrees", "wind_dir", "wdir"],
            ))
            .or(raw_wind_direction),
            visibility_mi: parse_number(csv_value(
                &record,
                &header_map,
                &["visibility_statute_mi", "visibility_mi", "visib"],
            )),
            altimeter_in_hg: parse_number(csv_value(
                &record,
                &header_map,
                &["altim_in_hg", "altimeter", "altim"],
            )),
            weather: csv_value(&record, &header_map, &["wx_string", "weather", "wx"])
                .unwrap_or_default()
                .trim()
                .to_string(),
            flight_category: csv_value(
                &record,
                &header_map,
                &["flight_category", "flight_category_name", "fltcat"],
            )
            .unwrap_or_default()
            .trim()
            .to_ascii_uppercase(),
        });
    }
    Ok(output)
}

fn parse_metar_cache(bytes: &[u8]) -> Result<Vec<SurfaceObservation>, StudioError> {
    let mut decoder = GzDecoder::new(bytes);
    let mut text = String::new();
    decoder.read_to_string(&mut text)?;
    let output = parse_metar_csv_text(&text)?;
    if output.len() < 500 {
        return Err(StudioError::Provider(format!(
            "Aviation Weather Center METAR cache produced only {} usable stations",
            output.len()
        )));
    }
    Ok(output)
}

async fn current_metars(force: bool) -> Result<(Vec<SurfaceObservation>, Option<String>), StudioError> {
    if !force {
        if let Some(value) = storage::read_cached_json(AWC_METAR_CACHE_KEY)? {
            return Ok((serde_json::from_value(value)?, None));
        }
    }
    let stale = storage::read_cached_json_allow_expired(AWC_METAR_CACHE_KEY)?;
    let result: Result<Vec<SurfaceObservation>, StudioError> = async {
        let url = reqwest::Url::parse(AWC_METAR_CACHE_URL)
            .map_err(|error| StudioError::Url(error.to_string()))?;
        let bytes = provider_client::fetch_bytes(
            url,
            "text/csv, application/gzip, application/octet-stream",
        )
        .await?;
        parse_metar_cache(&bytes)
    }
    .await;
    match result {
        Ok(observations) => {
            storage::write_cached_json(
                AWC_METAR_CACHE_KEY,
                60,
                &serde_json::to_value(&observations)?,
            )?;
            Ok((observations, None))
        }
        Err(error) => {
            let Some(value) = stale else {
                return Err(error);
            };
            let observations = serde_json::from_value(value)?;
            Ok((observations, Some(format!("Live METAR request failed: {error}"))))
        }
    }
}

fn observation_value(observation: &SurfaceObservation, field: &str) -> Option<f64> {
    match field {
        "tempF" => observation.temp_f,
        "dewpointF" => observation.dewpoint_f,
        "relativeHumidity" => observation.relative_humidity,
        "heatIndexF" => observation.heat_index_f,
        "windChillF" => observation.wind_chill_f,
        "windMph" => observation.wind_mph,
        "gustMph" => observation.gust_mph,
        "visibilityMi" => observation.visibility_mi,
        _ => None,
    }
}

fn field_metadata(field: &str) -> (&'static str, &'static str) {
    match field {
        "dewpointF" => ("Dew point", "°F"),
        "relativeHumidity" => ("Relative humidity", "%"),
        "heatIndexF" => ("Heat index", "°F"),
        "windChillF" => ("Wind chill", "°F"),
        "windMph" => ("Wind speed", "mph"),
        "gustMph" => ("Wind gust", "mph"),
        "visibilityMi" => ("Visibility", "mi"),
        "flightCategory" => ("Flight category", ""),
        _ => ("Temperature", "°F"),
    }
}

fn observation_feature(observation: &SurfaceObservation, field: &str) -> Value {
    let (field_label, field_units) = field_metadata(field);
    let field_value = observation_value(observation, field);
    let field_text = if field == "flightCategory" {
        observation.flight_category.clone()
    } else {
        field_value
            .map(|value| {
                if field_units == "%" {
                    format!("{}%", value.round() as i64)
                } else if field_units == "°F" {
                    format!("{}°", value.round() as i64)
                } else if field_units.is_empty() {
                    format!("{}", value.round() as i64)
                } else {
                    format!("{} {field_units}", value.round() as i64)
                }
            })
            .unwrap_or_default()
    };
    json!({
        "type": "Feature",
        "id": observation.station,
        "properties": {
            "station": observation.station,
            "displayName": observation.station,
            "observed": observation.observed,
            "raw": observation.raw,
            "tempF": observation.temp_f,
            "dewpointF": observation.dewpoint_f,
            "relativeHumidity": observation.relative_humidity,
            "heatIndexF": observation.heat_index_f,
            "windChillF": observation.wind_chill_f,
            "windMph": observation.wind_mph,
            "gustMph": observation.gust_mph,
            "windDirection": observation.wind_direction,
            "visibilityMi": observation.visibility_mi,
            "altimeterInHg": observation.altimeter_in_hg,
            "weather": observation.weather,
            "flightCategory": observation.flight_category,
            "field": field,
            "fieldLabel": field_label,
            "fieldUnits": field_units,
            "fieldValue": field_value,
            "fieldText": field_text
        },
        "geometry": {
            "type": "Point",
            "coordinates": [observation.longitude, observation.latitude]
        }
    })
}

fn point_inside_bbox(longitude: f64, latitude: f64, bbox: BBox, padding: f64) -> bool {
    longitude >= bbox.west - padding
        && longitude <= bbox.east + padding
        && latitude >= bbox.south - padding
        && latitude <= bbox.north + padding
}

fn haversine_km(latitude_a: f64, longitude_a: f64, latitude_b: f64, longitude_b: f64) -> f64 {
    let radius_km = 6_371.008_8;
    let lat_a = latitude_a.to_radians();
    let lat_b = latitude_b.to_radians();
    let delta_lat = (latitude_b - latitude_a).to_radians();
    let delta_lon = (longitude_b - longitude_a).to_radians();
    let value = (delta_lat / 2.0).sin().powi(2)
        + lat_a.cos() * lat_b.cos() * (delta_lon / 2.0).sin().powi(2);
    radius_km * 2.0 * value.sqrt().atan2((1.0 - value).sqrt())
}

fn station_quality(observation: &SurfaceObservation) -> usize {
    [
        observation.temp_f,
        observation.dewpoint_f,
        observation.relative_humidity,
        observation.wind_mph,
        observation.visibility_mi,
        observation.altimeter_in_hg,
    ]
    .iter()
    .filter(|value| value.is_some())
    .count()
}

fn select_station_labels<'a>(
    observations: &'a [SurfaceObservation],
    bbox: BBox,
    zoom: f64,
    density: u8,
    mode: &str,
    field: &str,
) -> Vec<&'a SurfaceObservation> {
    let mut candidates = observations
        .iter()
        .filter(|observation| {
            point_inside_bbox(observation.longitude, observation.latitude, bbox, 0.0)
                && (field == "flightCategory"
                    && !observation.flight_category.is_empty()
                    || observation_value(observation, field).is_some())
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| {
        station_quality(right)
            .cmp(&station_quality(left))
            .then_with(|| left.station.cmp(&right.station))
    });
    let base_target = if mode == "detailed" {
        if zoom < 4.0 { 120 } else if zoom < 6.0 { 260 } else if zoom < 8.0 { 480 } else { 800 }
    } else if mode == "standard" {
        if zoom < 4.0 { 70 } else if zoom < 6.0 { 150 } else if zoom < 8.0 { 300 } else { 520 }
    } else if zoom < 4.0 {
        30
    } else if zoom < 6.0 {
        65
    } else if zoom < 8.0 {
        140
    } else {
        260
    };
    let density_factor = 0.35 + f64::from(density.min(100)) / 100.0 * 1.15;
    let target = ((base_target as f64 * density_factor).round() as usize).clamp(16, 900);
    if candidates.len() <= target {
        return candidates;
    }
    let width = (bbox.east - bbox.west).max(0.1);
    let height = (bbox.north - bbox.south).max(0.1);
    let aspect = (width / height).clamp(0.3, 3.5);
    let columns = ((target as f64 * aspect).sqrt().round() as usize).max(4);
    let rows = ((target as f64 / columns as f64).ceil() as usize).max(3);
    let mut cells: HashMap<(usize, usize), &SurfaceObservation> = HashMap::new();
    for observation in candidates {
        let column = (((observation.longitude - bbox.west) / width) * columns as f64)
            .floor()
            .clamp(0.0, (columns - 1) as f64) as usize;
        let row = (((observation.latitude - bbox.south) / height) * rows as f64)
            .floor()
            .clamp(0.0, (rows - 1) as f64) as usize;
        cells.entry((column, row)).or_insert(observation);
        if cells.len() >= target {
            break;
        }
    }
    let mut selected = cells.into_values().collect::<Vec<_>>();
    selected.sort_by(|left, right| left.station.cmp(&right.station));
    selected
}

fn build_analysis_grid(
    observations: &[SurfaceObservation],
    bbox: BBox,
    zoom: f64,
    field: &str,
) -> (Vec<Value>, usize, usize) {
    if field == "flightCategory" || field == "visibilityMi" {
        return (Vec::new(), 0, 0);
    }
    let width = (bbox.east - bbox.west).max(0.1);
    let height = (bbox.north - bbox.south).max(0.1);
    let aspect = (width / height).clamp(0.35, 3.5);
    let target = if zoom < 4.0 { 1_250 } else if zoom < 6.5 { 1_500 } else if zoom < 9.0 { 1_200 } else { 900 };
    let columns = ((target as f64 * aspect).sqrt().round() as usize).clamp(24, 72);
    let rows = ((target as f64 / columns as f64).ceil() as usize).clamp(18, 54);
    let padding = width.max(height) * 0.22 + 1.0;
    let candidates = observations
        .iter()
        .filter_map(|observation| {
            let value = observation_value(observation, field)?;
            point_inside_bbox(observation.longitude, observation.latitude, bbox, padding)
                .then_some((observation, value))
        })
        .collect::<Vec<_>>();
    if candidates.is_empty() {
        return (Vec::new(), columns, rows);
    }
    let max_distance = if zoom < 4.0 { 760.0 } else if zoom < 6.0 { 460.0 } else if zoom < 8.5 { 280.0 } else { 150.0 };
    let mut features = Vec::with_capacity(columns * rows);
    for row in 0..rows {
        let latitude = bbox.north - ((row as f64 + 0.5) / rows as f64) * height;
        for column in 0..columns {
            let longitude = bbox.west + ((column as f64 + 0.5) / columns as f64) * width;
            let mut nearest: Vec<(f64, f64)> = Vec::with_capacity(8);
            for (observation, value) in &candidates {
                let distance = haversine_km(latitude, longitude, observation.latitude, observation.longitude);
                if distance > max_distance {
                    continue;
                }
                let index = nearest
                    .iter()
                    .position(|(existing, _)| distance < *existing)
                    .unwrap_or(nearest.len());
                nearest.insert(index, (distance, *value));
                if nearest.len() > 8 {
                    nearest.pop();
                }
            }
            if nearest.is_empty() {
                continue;
            }
            let mut weighted_value = 0.0;
            let mut total_weight = 0.0;
            for (distance, value) in &nearest {
                let weight = 1.0 / (distance * distance + 36.0);
                weighted_value += value * weight;
                total_weight += weight;
            }
            let value = weighted_value / total_weight;
            let nearest_distance = nearest[0].0;
            let coverage = (1.0 - nearest_distance / max_distance).clamp(0.0, 1.0);
            features.push(json!({
                "type": "Feature",
                "id": format!("analysis-{field}-{row}-{column}"),
                "properties": {
                    "field": field,
                    "fieldValue": (value * 10.0).round() / 10.0,
                    "gridRow": row,
                    "gridColumn": column,
                    "contributingStations": nearest.len(),
                    "nearestDistanceKm": (nearest_distance * 10.0).round() / 10.0,
                    "coverage": (coverage * 1000.0).round() / 1000.0
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                }
            }));
        }
    }
    (features, columns, rows)
}

pub async fn surface_observations(
    bbox: BBox,
    zoom: f64,
    density: u8,
    mode: String,
    field: String,
    force: bool,
) -> Result<Value, StudioError> {
    let bbox = bbox.validate()?;
    let zoom = zoom.clamp(2.0, 16.0);
    let mode = match mode.as_str() {
        "standard" | "detailed" => mode,
        _ => "broadcast".to_string(),
    };
    let field = match field.as_str() {
        "tempF" | "dewpointF" | "relativeHumidity" | "heatIndexF" | "windChillF"
        | "windMph" | "gustMph" | "visibilityMi" | "flightCategory" => field,
        _ => "tempF".to_string(),
    };
    let (observations, warning) = current_metars(force).await?;
    let labels = select_station_labels(&observations, bbox, zoom, density, &mode, &field)
        .into_iter()
        .map(|observation| observation_feature(observation, &field))
        .collect::<Vec<_>>();
    let (analysis_features, grid_columns, grid_rows) =
        build_analysis_grid(&observations, bbox, zoom, &field);
    let valid_count = observations
        .iter()
        .filter(|observation| observation_value(observation, &field).is_some())
        .count();
    let (field_label, field_units) = field_metadata(&field);
    let mut result = json!({
        "type": "FeatureCollection",
        "features": labels,
        "analysisFeatures": analysis_features,
        "provider": "NOAA Aviation Weather Center METAR cache",
        "generatedAt": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs().to_string())
            .unwrap_or_else(|_| "0".to_string()),
        "field": field,
        "fieldLabel": field_label,
        "fieldUnits": field_units,
        "displayMode": mode,
        "availableCount": observations.len(),
        "validCount": valid_count,
        "grid": {
            "columns": grid_columns,
            "rows": grid_rows,
            "bbox": bbox
        }
    });
    if let Some(warning) = warning {
        if let Some(object) = result.as_object_mut() {
            object.insert("cacheStatus".to_string(), Value::String("stale".to_string()));
            object.insert("cacheWarning".to_string(), Value::String(warning));
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn raw_metar_wind_is_decoded_when_csv_gust_is_absent() {
        let (direction, speed, gust) = raw_wind_components("KMCI 040153Z 18012G18KT 10SM CLR");
        assert_eq!(direction, Some(180.0));
        assert_eq!(speed, Some(12.0));
        assert_eq!(gust, Some(18.0));
    }

    #[test]
    fn derived_temperature_values_obey_application_ranges() {
        assert!(heat_index_fahrenheit(Some(95.0), Some(55.0)).unwrap() > 100.0);
        assert!(wind_chill_fahrenheit(Some(20.0), Some(20.0)).unwrap() < 20.0);
        assert!(heat_index_fahrenheit(Some(70.0), Some(80.0)).is_none());
    }

    #[test]
    fn numeric_parser_handles_visibility_qualifiers_and_fractions() {
        assert_eq!(parse_number(Some("10+")), Some(10.0));
        assert_eq!(parse_number(Some("<1/4")), Some(0.25));
        assert_eq!(parse_number(Some("1 1/2")), Some(1.5));
        assert_eq!(parse_number(Some("M")), None);
    }

    #[test]
    fn awc_csv_aliases_are_normalized() {
        let csv = "# sample cache\nstation_id,latitude,longitude,observation_time,raw_text,temp_c,dewpoint_c,wind_dir_degrees,wind_speed_kt,visibility_statute_mi,altim_in_hg,wx_string,flight_category\nKAAA,29.5,-98.5,2026-07-24T22:00:00Z,KAAA 242200Z 18012G18KT 10SM CLR,35,21,180,12,10+,29.92,TSRA,VFR\n";
        let observations = parse_metar_csv_text(csv).expect("sample CSV");
        assert_eq!(observations.len(), 1);
        let observation = &observations[0];
        assert_eq!(observation.station, "KAAA");
        assert_eq!(observation.gust_mph.map(|value| value.round()), Some(21.0));
        assert_eq!(observation.visibility_mi, Some(10.0));
        assert_eq!(observation.flight_category, "VFR");
        assert!(observation.heat_index_f.is_some());
    }

    #[test]
    fn station_selection_respects_bbox_and_density() {
        let observations = vec![
            SurfaceObservation {
                station: "KAAA".into(), latitude: 29.5, longitude: -98.5,
                observed: String::new(), raw: String::new(), temp_f: Some(90.0),
                dewpoint_f: Some(70.0), relative_humidity: Some(50.0), heat_index_f: Some(95.0),
                wind_chill_f: None, wind_mph: Some(10.0), gust_mph: None,
                wind_direction: Some(180.0), visibility_mi: Some(10.0), altimeter_in_hg: Some(29.92),
                weather: String::new(), flight_category: "VFR".into(),
            },
            SurfaceObservation {
                station: "KOUT".into(), latitude: 40.0, longitude: -110.0,
                observed: String::new(), raw: String::new(), temp_f: Some(60.0),
                dewpoint_f: Some(40.0), relative_humidity: Some(40.0), heat_index_f: None,
                wind_chill_f: None, wind_mph: Some(5.0), gust_mph: None,
                wind_direction: Some(0.0), visibility_mi: Some(10.0), altimeter_in_hg: Some(30.0),
                weather: String::new(), flight_category: "VFR".into(),
            },
        ];
        let selected = select_station_labels(
            &observations,
            BBox { west: -99.0, south: 29.0, east: -98.0, north: 30.0 },
            8.0,
            50,
            "broadcast",
            "tempF",
        );
        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0].station, "KAAA");
    }
}
