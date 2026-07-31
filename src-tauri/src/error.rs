use thiserror::Error;

#[derive(Debug, Error)]
pub enum StudioError {
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
    #[error("invalid PNG data URL")]
    InvalidPng,
    #[error("base64 decoding error: {0}")]
    Base64(#[from] base64::DecodeError),
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("CSV parsing error: {0}")]
    Csv(#[from] csv::Error),
    #[error("weather provider request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("invalid provider URL: {0}")]
    Url(String),
    #[error("provider returned an error: {0}")]
    Provider(String),
}

impl serde::Serialize for StudioError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
