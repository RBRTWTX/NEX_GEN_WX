use crate::{error::StudioError, weather_engine::provider_client};
use grib::Grib2SubmessageDecoder;
use reqwest::Url;
use serde_json::{json, Value};
use std::io::Cursor;

const HRRR_BUCKET_BASE: &str = "https://noaa-hrrr-bdp-pds.s3.amazonaws.com/";
const HRRR_NX: usize = 1799;
const HRRR_NY: usize = 1059;

fn valid_date(value: &str) -> bool {
    value.len() == 8
        && value.starts_with("20")
        && value.chars().all(|character| character.is_ascii_digit())
}

fn forecast_hours_from_listing(xml: &str, prefix: &str) -> Vec<u16> {
    let mut hours = Vec::new();
    let mut rest = xml;

    while let Some(start) = rest.find("<Key>") {
        let after_start = &rest[start + 5..];
        let Some(end) = after_start.find("</Key>") else {
            break;
        };
        let key = &after_start[..end];
        if key.starts_with(prefix) && key.ends_with(".grib2.idx") {
            if let Some(marker) = key.rfind("wrfsfcf") {
                let start = marker + "wrfsfcf".len();
                let end = start + 2;
                if end <= key.len() {
                    if let Ok(hour) = key[start..end].parse::<u16>() {
                        if hour <= 48 {
                            hours.push(hour);
                        }
                    }
                }
            }
        }
        rest = &after_start[end + "</Key>".len()..];
    }

    hours.sort_unstable();
    hours.dedup();
    hours
}

fn field_contract(field: &str) -> Result<(&'static str, &'static str), StudioError> {
    match field {
        "composite-reflectivity" => Ok((":REFC:entire atmosphere:", "dBZ")),
        "temperature-2m" => Ok((":TMP:2 m above ground:", "°F")),
        "dewpoint-2m" => Ok((":DPT:2 m above ground:", "°F")),
        "relative-humidity-2m" => Ok((":RH:2 m above ground:", "%")),
        "wind-gust-surface" => Ok((":GUST:surface:", "mph")),
        _ => Err(StudioError::Provider(format!(
            "Unsupported HRRR field: {field}"
        ))),
    }
}

fn sampling_stride(smoothing: &str) -> Result<usize, StudioError> {
    match smoothing {
        "sharp" => Ok(6),
        "balanced" => Ok(8),
        "smooth" => Ok(12),
        _ => Err(StudioError::Provider(format!(
            "Unsupported model smoothing mode: {smoothing}"
        ))),
    }
}

fn surface_grib_url(date: &str, cycle: u8, forecast_hour: u16) -> Result<Url, StudioError> {
    Url::parse(&format!(
        "{HRRR_BUCKET_BASE}hrrr.{date}/conus/hrrr.t{cycle:02}z.wrfsfcf{forecast_hour:02}.grib2"
    ))
    .map_err(|error| StudioError::Url(error.to_string()))
}

fn record_offset(line: &str) -> Option<u64> {
    line.split(':').nth(1)?.parse::<u64>().ok()
}

fn record_range_from_index(index: &str, needle: &str) -> Result<(u64, u64), StudioError> {
    let lines: Vec<&str> = index.lines().filter(|line| !line.trim().is_empty()).collect();
    let record_index = lines
        .iter()
        .position(|line| line.contains(needle))
        .ok_or_else(|| StudioError::Provider(format!(
            "HRRR index does not contain requested field {needle}"
        )))?;
    let start = record_offset(lines[record_index]).ok_or_else(|| {
        StudioError::Provider("HRRR index record has an invalid byte offset.".to_string())
    })?;
    let next = lines
        .get(record_index + 1)
        .and_then(|line| record_offset(line))
        .ok_or_else(|| StudioError::Provider(
            "HRRR requested field is the final index record; bounded range is unavailable.".to_string(),
        ))?;
    if next <= start {
        return Err(StudioError::Provider(
            "HRRR index returned an invalid byte range.".to_string(),
        ));
    }
    Ok((start, next - 1))
}

fn sampled_axis(length: usize, stride: usize) -> Vec<usize> {
    let mut result: Vec<usize> = (0..length).step_by(stride).collect();
    if result.last().copied() != Some(length - 1) {
        result.push(length - 1);
    }
    result
}

fn convert_value(field: &str, value: f32) -> Option<f32> {
    if !value.is_finite() {
        return None;
    }
    match field {
        "temperature-2m" | "dewpoint-2m" => Some(value * 9.0 / 5.0 - 459.67),
        "relative-humidity-2m" | "composite-reflectivity" => Some(value),
        "wind-gust-surface" => Some(value * 2.236_936_3),
        _ => None,
    }
}

pub async fn hrrr_cycle_catalog(
    date: &str,
    cycle: u8,
    _force: bool,
) -> Result<Value, StudioError> {
    if !valid_date(date) {
        return Err(StudioError::Provider(
            "HRRR date must use YYYYMMDD.".to_string(),
        ));
    }
    if cycle > 23 {
        return Err(StudioError::Provider(
            "HRRR cycle must be between 00 and 23 UTC.".to_string(),
        ));
    }

    let prefix = format!(
        "hrrr.{date}/conus/hrrr.t{cycle:02}z.wrfsfcf"
    );
    let mut url = Url::parse(HRRR_BUCKET_BASE)
        .map_err(|error| StudioError::Url(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("list-type", "2")
        .append_pair("prefix", &prefix);

    let bytes = provider_client::fetch_bytes(
        url,
        "application/xml,text/xml;q=0.9,*/*;q=0.1",
    )
    .await?;
    let xml = String::from_utf8(bytes)
        .map_err(|error| StudioError::Provider(format!("HRRR catalog was not UTF-8: {error}")))?;
    let forecast_hours = forecast_hours_from_listing(&xml, &prefix);

    Ok(json!({
        "provider": "noaa-nodd-hrrr",
        "model": "hrrr",
        "date": date,
        "cycle": cycle,
        "forecastHours": forecast_hours,
        "cacheStatus": "live",
        "source": HRRR_BUCKET_BASE,
    }))
}

pub async fn hrrr_field(
    date: &str,
    cycle: u8,
    forecast_hour: u16,
    field: &str,
    smoothing: &str,
    _force: bool,
) -> Result<Value, StudioError> {
    if !valid_date(date) {
        return Err(StudioError::Provider(
            "HRRR date must use YYYYMMDD.".to_string(),
        ));
    }
    if cycle > 23 || forecast_hour > 48 {
        return Err(StudioError::Provider(
            "HRRR cycle or forecast hour is outside the supported range.".to_string(),
        ));
    }
    let (needle, unit) = field_contract(field)?;
    let stride = sampling_stride(smoothing)?;
    let grib_url = surface_grib_url(date, cycle, forecast_hour)?;
    let index_url = Url::parse(&format!("{}.idx", grib_url.as_str()))
        .map_err(|error| StudioError::Url(error.to_string()))?;

    let index_bytes = provider_client::fetch_bytes(
        index_url,
        "text/plain,*/*;q=0.1",
    )
    .await?;
    let index_text = String::from_utf8(index_bytes)
        .map_err(|error| StudioError::Provider(format!("HRRR index was not UTF-8: {error}")))?;
    let (start, end) = record_range_from_index(&index_text, needle)?;
    let record_bytes = provider_client::fetch_bytes_range(
        grib_url,
        start,
        end,
        "application/octet-stream,*/*;q=0.1",
    )
    .await?;

    let grib2 = grib::from_reader(Cursor::new(record_bytes))
        .map_err(|error| StudioError::Provider(format!("HRRR GRIB2 parse failed: {error}")))?;
    let (_, submessage) = grib2
        .iter()
        .next()
        .ok_or_else(|| StudioError::Provider("HRRR GRIB2 record contained no submessage.".to_string()))?;
    let (nx, ny) = submessage
        .grid_shape()
        .map_err(|error| StudioError::Provider(format!("HRRR grid shape failed: {error}")))?;
    if nx != HRRR_NX || ny != HRRR_NY {
        return Err(StudioError::Provider(format!(
            "Unexpected HRRR CONUS grid {nx}x{ny}; expected {HRRR_NX}x{HRRR_NY}."
        )));
    }

    let indices: Vec<(usize, usize)> = submessage
        .ij()
        .map_err(|error| StudioError::Provider(format!("HRRR scanning mode failed: {error}")))?
        .collect();
    let decoder = Grib2SubmessageDecoder::from(submessage)
        .map_err(|error| StudioError::Provider(format!("HRRR decoder setup failed: {error}")))?;
    let decoded = decoder
        .dispatch()
        .map_err(|error| StudioError::Provider(format!("HRRR field decode failed: {error}")))?;

    let mut dense = vec![None; nx * ny];
    for ((i, j), value) in indices.into_iter().zip(decoded) {
        if i < nx && j < ny {
            dense[j * nx + i] = convert_value(field, value);
        }
    }

    let i_indices = sampled_axis(nx, stride);
    let j_indices = sampled_axis(ny, stride);
    if i_indices.len() * j_indices.len() > u16::MAX as usize {
        return Err(StudioError::Provider(
            "HRRR sampled model mesh exceeds the 16-bit renderer index limit.".to_string(),
        ));
    }
    let mut values = Vec::with_capacity(i_indices.len() * j_indices.len());
    for &j in &j_indices {
        for &i in &i_indices {
            values.push(dense[j * nx + i]);
        }
    }

    Ok(json!({
        "provider": "noaa-nodd-hrrr",
        "model": "hrrr",
        "field": field,
        "runId": format!("{date}T{cycle:02}Z"),
        "date": date,
        "cycle": cycle,
        "forecastHour": forecast_hour,
        "nx": nx,
        "ny": ny,
        "iIndices": i_indices,
        "jIndices": j_indices,
        "values": values,
        "unit": unit,
        "cacheStatus": "live",
        "byteRange": format!("{start}-{end}"),
        "source": HRRR_BUCKET_BASE,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hrrr_listing_parser_collects_surface_index_hours() {
        let prefix = "hrrr.20260818/conus/hrrr.t16z.wrfsfcf";
        let xml = concat!(
            "<ListBucketResult>",
            "<Contents><Key>hrrr.20260818/conus/hrrr.t16z.wrfsfcf00.grib2</Key></Contents>",
            "<Contents><Key>hrrr.20260818/conus/hrrr.t16z.wrfsfcf00.grib2.idx</Key></Contents>",
            "<Contents><Key>hrrr.20260818/conus/hrrr.t16z.wrfsfcf01.grib2.idx</Key></Contents>",
            "<Contents><Key>hrrr.20260818/conus/hrrr.t16z.wrfsfcf18.grib2.idx</Key></Contents>",
            "</ListBucketResult>"
        );
        assert_eq!(forecast_hours_from_listing(xml, prefix), vec![0, 1, 18]);
    }

    #[test]
    fn hrrr_date_validation_rejects_non_dates() {
        assert!(valid_date("20260818"));
        assert!(!valid_date("2026-08-18"));
        assert!(!valid_date("19991231"));
    }

    #[test]
    fn hrrr_index_range_targets_only_requested_record() {
        let index = concat!(
            "1:0:d=2026081817:REFC:entire atmosphere:3 hour fcst:\n",
            "2:381614:d=2026081817:RETOP:cloud top:3 hour fcst:\n",
            "3:564153:d=2026081817:TMP:2 m above ground:3 hour fcst:\n",
            "4:701000:d=2026081817:DPT:2 m above ground:3 hour fcst:\n"
        );
        assert_eq!(
            record_range_from_index(index, ":REFC:entire atmosphere:").unwrap(),
            (0, 381613)
        );
        assert_eq!(
            record_range_from_index(index, ":TMP:2 m above ground:").unwrap(),
            (564153, 700999)
        );
    }

    #[test]
    fn hrrr_surface_broadcast_field_contracts_are_exact() {
        assert_eq!(field_contract("temperature-2m").unwrap(), (":TMP:2 m above ground:", "°F"));
        assert_eq!(field_contract("dewpoint-2m").unwrap(), (":DPT:2 m above ground:", "°F"));
        assert_eq!(field_contract("relative-humidity-2m").unwrap(), (":RH:2 m above ground:", "%"));
        assert_eq!(field_contract("wind-gust-surface").unwrap(), (":GUST:surface:", "mph"));
        assert!(field_contract("not-a-field").is_err());
    }

    #[test]
    fn hrrr_surface_broadcast_unit_conversions_are_stable() {
        let freezing = convert_value("temperature-2m", 273.15).unwrap();
        assert!((freezing - 32.0).abs() < 0.01);
        let dewpoint = convert_value("dewpoint-2m", 283.15).unwrap();
        assert!((dewpoint - 50.0).abs() < 0.02);
        assert_eq!(convert_value("relative-humidity-2m", 67.0).unwrap(), 67.0);
        let gust = convert_value("wind-gust-surface", 10.0).unwrap();
        assert!((gust - 22.369_363).abs() < 0.01);
    }

    #[test]
    fn hrrr_downsample_keeps_grid_edges_and_renderer_limit() {
        for stride in [6usize, 8, 12] {
            let i = sampled_axis(HRRR_NX, stride);
            let j = sampled_axis(HRRR_NY, stride);
            assert_eq!(i.first(), Some(&0));
            assert_eq!(i.last(), Some(&(HRRR_NX - 1)));
            assert_eq!(j.first(), Some(&0));
            assert_eq!(j.last(), Some(&(HRRR_NY - 1)));
            assert!(i.len() * j.len() <= u16::MAX as usize);
        }
    }
}
