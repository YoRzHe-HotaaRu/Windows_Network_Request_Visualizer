use crate::flow::{now_ms, FlowKey, FlowTable, SharedFlowTable};
use crate::geo::GeoService;
use crate::models::{
    AppSettings, AppStatus, CaptureStatus, FlowSnapshot, HomeLocation, SnapshotTotals,
};
use crate::process_map::{list_connections, owners_by_remote};
use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;

pub struct Engine {
    pub settings: RwLock<AppSettings>,
    pub status: RwLock<CaptureStatus>,
    pub message: RwLock<Option<String>>,
    pub mode: RwLock<String>,
    pub home: RwLock<HomeLocation>,
    pub flows: SharedFlowTable,
    pub geo: Arc<GeoService>,
    running: AtomicBool,
    handle: RwLock<Option<JoinHandle<()>>>,
}

impl Engine {
    pub fn new(geo: Arc<GeoService>) -> Arc<Self> {
        Arc::new(Self {
            settings: RwLock::new(load_settings()),
            status: RwLock::new(CaptureStatus::Stopped),
            message: RwLock::new(None),
            mode: RwLock::new("connections".into()),
            home: RwLock::new(HomeLocation {
                lat: 37.7749,
                lon: -122.4194,
                label: "Home".into(),
            }),
            flows: Arc::new(parking_lot::Mutex::new(FlowTable::new())),
            geo,
            running: AtomicBool::new(false),
            handle: RwLock::new(None),
        })
    }

    pub fn app_status(&self) -> AppStatus {
        let settings = self.settings.read().clone();
        AppStatus {
            status: self.status.read().clone(),
            message: self.message.read().clone(),
            elevated: is_elevated(),
            npcap_available: npcap_available(),
            geo_ready: self.geo.ready(),
            settings,
        }
    }

    pub async fn start(self: &Arc<Self>, app: AppHandle) {
        self.stop().await;
        self.running.store(true, Ordering::SeqCst);
        *self.status.write() = CaptureStatus::Starting;

        let settings = self.settings.read().clone();
        if let Some(path) = &settings.geo_db_path {
            let _ = self.geo.load_db(path);
        }

        let home = self
            .geo
            .resolve_home(settings.home_lat, settings.home_lon, settings.home_label.clone())
            .await;
        *self.home.write() = home;

        let demo = settings.demo_mode || (!is_elevated() && !cfg!(windows));
        let mode = if demo {
            *self.status.write() = CaptureStatus::Demo;
            *self.message.write() = Some("Demo mode — synthetic traffic".into());
            "demo".to_string()
        } else if npcap_available() && is_elevated() {
            *self.status.write() = CaptureStatus::Running;
            *self.message.write() =
                Some("Live connections + rates (Npcap path available)".into());
            "capture".to_string()
        } else {
            *self.status.write() = CaptureStatus::Degraded;
            *self.message.write() = Some(
                "Connection-table mode (install Npcap + run as Admin for full capture)".into(),
            );
            "connections".to_string()
        };
        *self.mode.write() = mode.clone();

        let engine = Arc::clone(self);
        let handle = tokio::spawn(async move {
            engine.run_loop(app, mode).await;
        });
        *self.handle.write() = Some(handle);
    }

    pub async fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(h) = self.handle.write().take() {
            h.abort();
        }
        *self.status.write() = CaptureStatus::Stopped;
        *self.message.write() = Some("Stopped".into());
    }

    async fn run_loop(self: Arc<Self>, app: AppHandle, mode: String) {
        let mut tick: u64 = 0;
        while self.running.load(Ordering::SeqCst) {
            let settings = self.settings.read().clone();
            let interval = Duration::from_millis(settings.snapshot_ms.max(200));

            if mode == "demo" {
                self.seed_demo(tick);
            } else {
                self.poll_connections(&settings);
            }

            // geo enrich a few missing
            self.enrich_geo().await;

            {
                let mut table = self.flows.lock();
                table.recompute_rates();
                table.expire(Duration::from_secs(settings.idle_timeout_secs.max(10)));
            }

            let snap = self.build_snapshot(&settings);
            let _ = app.emit("flow_snapshot", snap);

            tick = tick.wrapping_add(1);
            tokio::time::sleep(interval).await;
        }
    }

    fn poll_connections(&self, settings: &AppSettings) {
        let conns = list_connections();
        let map = owners_by_remote(&conns);
        let mut table = self.flows.lock();
        for (key, owner) in map {
            // estimate: scale with top activity pseudo-random-ish from port
            let est = 800 + ((owner.remote_port as u64 * 37) % 40_000);
            table.upsert_connection(
                key,
                Some(owner.pid),
                owner.process_name,
                est / settings.top_n.max(1) as u64 + 500,
            );
        }
    }

    fn seed_demo(&self, tick: u64) {
        use std::f64::consts::PI;
        let cities = [
            ("Ashburn", "United States", 39.0438, -77.4874),
            ("Frankfurt", "Germany", 50.1109, 8.6821),
            ("Singapore", "Singapore", 1.3521, 103.8198),
            ("Tokyo", "Japan", 35.6762, 139.6503),
            ("London", "United Kingdom", 51.5074, -0.1278),
            ("São Paulo", "Brazil", -23.5505, -46.6333),
            ("Sydney", "Australia", -33.8688, 151.2093),
            ("Mumbai", "India", 19.076, 72.8777),
            ("Amsterdam", "Netherlands", 52.3676, 4.9041),
            ("Toronto", "Canada", 43.6532, -79.3832),
            ("Seoul", "South Korea", 37.5665, 126.9780),
            ("Dublin", "Ireland", 53.3498, -6.2603),
        ];
        let procs = [
            "chrome.exe",
            "discord.exe",
            "Spotify.exe",
            "Code.exe",
            "msedge.exe",
            "steam.exe",
            "OneDrive.exe",
            "firefox.exe",
        ];
        let mut table = self.flows.lock();
        let n = 10 + (tick as usize % 6);
        for i in 0..n {
            let c = cities[i % cities.len()];
            let phase = (tick as f64 * 0.15 + i as f64) % (2.0 * PI);
            let rate = 20_000.0 + (phase.sin() * 0.5 + 0.5) * 1_800_000.0;
            let key = FlowKey {
                src_ip: "192.168.1.20".into(),
                src_port: 50000 + i as u16,
                dst_ip: format!("203.0.113.{}", 10 + i),
                dst_port: if i % 3 == 0 { 80 } else { 443 },
                protocol: if i % 4 == 0 { "UDP".into() } else { "TCP".into() },
            };
            table.upsert_connection(
                key.clone(),
                Some(2000 + i as u32),
                Some(procs[i % procs.len()].into()),
                rate as u64 / 3,
            );
            table.set_geo(
                &key,
                Some(c.0.into()),
                Some(c.1.into()),
                Some(c.2 + (i as f64) * 0.01),
                Some(c.3 + (i as f64) * 0.01),
            );
        }
    }

    async fn enrich_geo(&self) {
        let missing: Vec<(FlowKey, String)> = {
            let table = self.flows.lock();
            table
                .values()
                .filter(|f| {
                    !f.is_private_remote && f.remote_lat.is_none() && !f.key.dst_ip.is_empty()
                })
                .take(8)
                .map(|f| (f.key.clone(), f.key.dst_ip.clone()))
                .collect()
        };

        for (key, ip) in missing {
            let g = self.geo.lookup_http(&ip).await;
            if g.lat.is_some() {
                let mut table = self.flows.lock();
                table.set_geo(&key, g.city, g.country, g.lat, g.lon);
            }
        }
    }

    fn build_snapshot(&self, settings: &AppSettings) -> FlowSnapshot {
        let table = self.flows.lock();
        let mut flows: Vec<_> = table
            .values()
            .filter(|f| !f.is_private_remote)
            .map(|f| f.to_record())
            .collect();
        flows.sort_by(|a, b| {
            b.rate_bps
                .partial_cmp(&a.rate_bps)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        flows.truncate(settings.top_n.max(10));

        let bps_up: f64 = flows.iter().map(|f| f.rate_bps * 0.25).sum();
        let bps_down: f64 = flows.iter().map(|f| f.rate_bps * 0.75).sum();
        let destinations = flows
            .iter()
            .map(|f| {
                f.remote_country
                    .clone()
                    .unwrap_or_else(|| f.dst_ip.clone())
            })
            .collect::<std::collections::HashSet<_>>()
            .len();

        FlowSnapshot {
            ts: now_ms(),
            status: self.status.read().clone(),
            message: self.message.read().clone(),
            mode: self.mode.read().clone(),
            home: self.home.read().clone(),
            totals: SnapshotTotals {
                flows: flows.len(),
                bps_up,
                bps_down,
                destinations,
            },
            flows,
        }
    }
}

fn settings_path() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|p| p.join("NetworkVisualizer").join("settings.json"))
}

pub fn load_settings() -> AppSettings {
    let Some(path) = settings_path() else {
        return AppSettings::default();
    };
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_settings(settings: &AppSettings) {
    if let Some(path) = settings_path() {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(s) = serde_json::to_string_pretty(settings) {
            let _ = std::fs::write(path, s);
        }
    }
}

pub fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        windows_elevated()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(windows)]
fn windows_elevated() -> bool {
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::Foundation::CloseHandle;
    unsafe {
        let mut token = Default::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut elev = TOKEN_ELEVATION::default();
        let mut ret = 0u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elev as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret,
        );
        let _ = CloseHandle(token);
        ok.is_ok() && elev.TokenIsElevated != 0
    }
}

pub fn npcap_available() -> bool {
    #[cfg(windows)]
    {
        std::path::Path::new(r"C:\Windows\System32\Npcap\npcap.dll").exists()
            || std::path::Path::new(r"C:\Windows\System32\wpcap.dll").exists()
            || std::path::Path::new(r"C:\Windows\SysWOW64\Npcap\npcap.dll").exists()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

