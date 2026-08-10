use crate::models::FlowRecord;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub struct FlowKey {
    pub src_ip: String,
    pub src_port: u16,
    pub dst_ip: String,
    pub dst_port: u16,
    pub protocol: String,
}

#[derive(Clone, Debug)]
pub struct InternalFlow {
    pub key: FlowKey,
    pub bytes_up: u64,
    pub bytes_down: u64,
    pub packets: u64,
    pub rate_bps: f64,
    pub last_bytes: u64,
    pub last_rate_ts: i64,
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

impl InternalFlow {
    pub fn id(&self) -> String {
        format!(
            "{}:{}-{}:{}-{}",
            self.key.src_ip, self.key.src_port, self.key.dst_ip, self.key.dst_port, self.key.protocol
        )
    }

    pub fn to_record(&self) -> FlowRecord {
        FlowRecord {
            id: self.id(),
            protocol: self.key.protocol.clone(),
            src_ip: self.key.src_ip.clone(),
            src_port: self.key.src_port,
            dst_ip: self.key.dst_ip.clone(),
            dst_port: self.key.dst_port,
            bytes_up: self.bytes_up,
            bytes_down: self.bytes_down,
            packets: self.packets,
            rate_bps: self.rate_bps,
            pid: self.pid,
            process_name: self.process_name.clone(),
            remote_city: self.remote_city.clone(),
            remote_country: self.remote_country.clone(),
            remote_lat: self.remote_lat,
            remote_lon: self.remote_lon,
            first_seen: self.first_seen,
            last_seen: self.last_seen,
            is_private_remote: self.is_private_remote,
        }
    }
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn is_private_ip(ip: &str) -> bool {
    let Ok(addr) = ip.parse::<IpAddr>() else {
        return true;
    };
    match addr {
        IpAddr::V4(v4) => {
            v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                || v4.octets()[0] == 0
        }
        IpAddr::V6(v6) => v6.is_loopback() || v6.is_unspecified() || {
            // unique local fc00::/7
            (v6.segments()[0] & 0xfe00) == 0xfc00
        },
    }
}

#[derive(Default)]
pub struct FlowTable {
    flows: HashMap<FlowKey, InternalFlow>,
}

impl FlowTable {
    pub fn new() -> Self {
        Self {
            flows: HashMap::new(),
        }
    }

    pub fn upsert_connection(
        &mut self,
        key: FlowKey,
        pid: Option<u32>,
        process_name: Option<String>,
        estimated_delta_bytes: u64,
    ) {
        let ts = now_ms();
        let private = is_private_ip(&key.dst_ip);
        let entry = self.flows.entry(key.clone()).or_insert_with(|| InternalFlow {
            key: key.clone(),
            bytes_up: 0,
            bytes_down: 0,
            packets: 0,
            rate_bps: 0.0,
            last_bytes: 0,
            last_rate_ts: ts,
            pid,
            process_name: process_name.clone(),
            remote_city: None,
            remote_country: None,
            remote_lat: None,
            remote_lon: None,
            first_seen: ts,
            last_seen: ts,
            is_private_remote: private,
        });

        entry.last_seen = ts;
        entry.is_private_remote = private;
        if pid.is_some() {
            entry.pid = pid;
        }
        if process_name.is_some() {
            entry.process_name = process_name;
        }
        // Approximate activity when we only see connection presence
        let up = estimated_delta_bytes / 4;
        let down = estimated_delta_bytes.saturating_sub(up);
        entry.bytes_up = entry.bytes_up.saturating_add(up);
        entry.bytes_down = entry.bytes_down.saturating_add(down);
        entry.packets = entry.packets.saturating_add(1 + estimated_delta_bytes / 1200);
    }

    pub fn apply_packet(
        &mut self,
        key: FlowKey,
        len: u64,
        uplink: bool,
        pid: Option<u32>,
        process_name: Option<String>,
    ) {
        let ts = now_ms();
        let private = is_private_ip(&key.dst_ip);
        let entry = self.flows.entry(key.clone()).or_insert_with(|| InternalFlow {
            key: key.clone(),
            bytes_up: 0,
            bytes_down: 0,
            packets: 0,
            rate_bps: 0.0,
            last_bytes: 0,
            last_rate_ts: ts,
            pid,
            process_name: process_name.clone(),
            remote_city: None,
            remote_country: None,
            remote_lat: None,
            remote_lon: None,
            first_seen: ts,
            last_seen: ts,
            is_private_remote: private,
        });
        entry.last_seen = ts;
        entry.packets += 1;
        if uplink {
            entry.bytes_up += len;
        } else {
            entry.bytes_down += len;
        }
        if pid.is_some() {
            entry.pid = pid;
        }
        if process_name.is_some() {
            entry.process_name = process_name;
        }
    }

    pub fn recompute_rates(&mut self) {
        let ts = now_ms();
        for f in self.flows.values_mut() {
            let total = f.bytes_up + f.bytes_down;
            let dt = ((ts - f.last_rate_ts) as f64 / 1000.0).max(0.05);
            let instant = (total.saturating_sub(f.last_bytes) as f64) / dt;
            // EMA
            f.rate_bps = f.rate_bps * 0.65 + instant * 0.35;
            f.last_bytes = total;
            f.last_rate_ts = ts;
        }
    }

    pub fn expire(&mut self, idle: Duration) {
        let ts = now_ms();
        let idle_ms = idle.as_millis() as i64;
        self.flows.retain(|_, f| ts - f.last_seen <= idle_ms);
    }

    pub fn set_geo(
        &mut self,
        key: &FlowKey,
        city: Option<String>,
        country: Option<String>,
        lat: Option<f64>,
        lon: Option<f64>,
    ) {
        if let Some(f) = self.flows.get_mut(key) {
            f.remote_city = city;
            f.remote_country = country;
            f.remote_lat = lat;
            f.remote_lon = lon;
        }
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut InternalFlow> {
        self.flows.values_mut()
    }

    pub fn values(&self) -> impl Iterator<Item = &InternalFlow> {
        self.flows.values()
    }

    pub fn len(&self) -> usize {
        self.flows.len()
    }
}

pub type SharedFlowTable = Arc<Mutex<FlowTable>>;
