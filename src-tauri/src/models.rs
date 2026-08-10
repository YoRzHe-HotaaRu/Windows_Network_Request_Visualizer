use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CaptureStatus {
    #[serde(rename = "stopped")]
    Stopped,
    #[serde(rename = "starting")]
    Starting,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "demo")]
    Demo,
    #[serde(rename = "error")]
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowRecord {
    pub id: String,
    pub protocol: String,
    pub src_ip: String,
    pub src_port: u16,
    pub dst_ip: String,
    pub dst_port: u16,
    pub bytes_up: u64,
    pub bytes_down: u64,
    pub packets: u64,
    pub rate_bps: f64,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub remote_city: Option<String>,
    pub remote_country: Option<String>,
    pub remote_lat: Option<f64>,
    pub remote_lon: Option<f64>,
    pub first_seen: i64,
    pub last_seen: i64,
    pub is_private_remote: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotTotals {
    pub flows: usize,
    pub bps_up: f64,
    pub bps_down: f64,
    pub destinations: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeLocation {
    pub lat: f64,
    pub lon: f64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowSnapshot {
    pub ts: i64,
    pub status: CaptureStatus,
    pub message: Option<String>,
    pub mode: String,
    pub home: HomeLocation,
    pub totals: SnapshotTotals,
    pub flows: Vec<FlowRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub interface_id: Option<String>,
    pub idle_timeout_secs: u64,
    pub top_n: usize,
    pub snapshot_ms: u64,
    pub demo_mode: bool,
    pub home_lat: Option<f64>,
    pub home_lon: Option<f64>,
    pub home_label: Option<String>,
    pub geo_db_path: Option<String>,
    pub first_run_complete: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            interface_id: None,
            idle_timeout_secs: 45,
            top_n: 80,
            snapshot_ms: 400,
            demo_mode: false,
            home_lat: None,
            home_lon: None,
            home_label: None,
            geo_db_path: None,
            first_run_complete: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub status: CaptureStatus,
    pub message: Option<String>,
    pub elevated: bool,
    pub npcap_available: bool,
    pub geo_ready: bool,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetInterface {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}
