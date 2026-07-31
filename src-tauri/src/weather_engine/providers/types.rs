use crate::error::StudioError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BBox {
    pub west: f64,
    pub south: f64,
    pub east: f64,
    pub north: f64,
}

impl BBox {
    pub fn validate(self) -> Result<Self, StudioError> {
        if !self.west.is_finite()
            || !self.south.is_finite()
            || !self.east.is_finite()
            || !self.north.is_finite()
            || self.west >= self.east
            || self.south >= self.north
            || self.west < -180.0
            || self.east > 180.0
            || self.south < -90.0
            || self.north > 90.0
        {
            return Err(StudioError::Provider("invalid map bounding box".to_string()));
        }
        Ok(self)
    }

    pub fn envelope(self) -> String {
        format!("{},{},{},{}", self.west, self.south, self.east, self.north)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_bbox_round_trips_to_arcgis_envelope() {
        let bbox = BBox { west: -99.0, south: 29.0, east: -98.0, north: 30.0 };
        assert_eq!(bbox.validate().expect("valid bbox").envelope(), "-99,29,-98,30");
    }

    #[test]
    fn invalid_bbox_is_rejected_before_provider_io() {
        let reversed = BBox { west: -98.0, south: 29.0, east: -99.0, north: 30.0 };
        let out_of_range = BBox { west: -181.0, south: 29.0, east: -98.0, north: 30.0 };
        assert!(reversed.validate().is_err());
        assert!(out_of_range.validate().is_err());
    }
}
