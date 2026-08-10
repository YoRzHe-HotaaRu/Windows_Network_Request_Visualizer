use crate::flow::is_private_ip;
use crate::models::HomeLocation;
use maxminddb::geoip2;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::IpAddr;
use std::path::Path;
use std::sync::Arc;

#[derive(Clone, Debug, Default)]
pub struct GeoResult {
    pub city: Option<String>,
    pub country: Option<String>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

pub struct GeoService {
    reader: RwLock<Option<maxminddb::Reader<Vec<u8>>>>,
    cache: RwLock<HashMap<String, GeoResult>>,
    http: reqwest::Client,
}

impl GeoService {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            reader: RwLock::new(None),
            cache: RwLock::new(HashMap::new()),
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(4))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        })
    }

    pub fn load_db(&self, path: &str) -> Result<(), String> {
        if path.trim().is_empty() {
            *self.reader.write() = None;
            return Ok(());
        }
        if !Path::new(path).exists() {
            return Err(format!("GEO_DB_MISSING: {path}"));
        }
        let reader = maxminddb::Reader::open_readfile(path).map_err(|e| e.to_string())?;
        *self.reader.write() = Some(reader);
        Ok(())
    }

    pub fn ready(&self) -> bool {
        self.reader.read().is_some()
    }

    pub fn lookup_sync(&self, ip: &str) -> GeoResult {
        if is_private_ip(ip) {
            return GeoResult::default();
        }
        if let Some(c) = self.cache.read().get(ip).cloned() {
            return c;
        }
        let result = self.lookup_mmdb(ip).unwrap_or_default();
        if result.lat.is_some() {
            self.cache.write().insert(ip.to_string(), result.clone());
        }
        result
    }

    fn lookup_mmdb(&self, ip: &str) -> Option<GeoResult> {
        let addr: IpAddr = ip.parse().ok()?;
        let guard = self.reader.read();
        let reader = guard.as_ref()?;
        let city: geoip2::City<'_> = reader.lookup(addr).ok()?;
        let lat = city.location.as_ref().and_then(|l| l.latitude);
        let lon = city.location.as_ref().and_then(|l| l.longitude);
        let country = city
            .country
            .as_ref()
            .and_then(|c| c.names.as_ref())
            .and_then(|n| n.get("en").map(|s| (*s).to_string()));
        let city_name = city
            .city
            .as_ref()
            .and_then(|c| c.names.as_ref())
            .and_then(|n| n.get("en").map(|s| (*s).to_string()));
        Some(GeoResult {
            city: city_name,
            country,
            lat,
            lon,
        })
    }

    pub async fn lookup_http(&self, ip: &str) -> GeoResult {
        if is_private_ip(ip) {
            return GeoResult::default();
        }
        if let Some(c) = self.cache.read().get(ip).cloned() {
            if c.lat.is_some() {
                return c;
            }
        }
        if let Some(r) = self.lookup_mmdb(ip) {
            if r.lat.is_some() {
                self.cache.write().insert(ip.to_string(), r.clone());
                return r;
            }
        }

        #[derive(Deserialize)]
        struct IpApi {
            status: String,
            city: Option<String>,
            country: Option<String>,
            lat: Option<f64>,
            lon: Option<f64>,
        }

        let url = format!("http://ip-api.com/json/{ip}?fields=status,city,country,lat,lon");
        let Ok(resp) = self.http.get(url).send().await else {
            return GeoResult::default();
        };
        let Ok(body) = resp.json::<IpApi>().await else {
            return GeoResult::default();
        };
        if body.status != "success" {
            return GeoResult::default();
        }
        let r = GeoResult {
            city: body.city,
            country: body.country,
            lat: body.lat,
            lon: body.lon,
        };
        self.cache.write().insert(ip.to_string(), r.clone());
        r
    }

    pub async fn resolve_home(
        &self,
        override_lat: Option<f64>,
        override_lon: Option<f64>,
        override_label: Option<String>,
    ) -> HomeLocation {
        if let (Some(lat), Some(lon)) = (override_lat, override_lon) {
            return HomeLocation {
                lat,
                lon,
                label: override_label.unwrap_or_else(|| "Home".into()),
            };
        }

        let public_ip = match self.http.get("https://api.ipify.org").send().await {
            Ok(resp) => resp.text().await.ok().map(|s| s.trim().to_string()),
            Err(_) => None,
        };

        if let Some(ip) = public_ip {
            let g = self.lookup_http(&ip).await;
            if let (Some(lat), Some(lon)) = (g.lat, g.lon) {
                let label = match (g.city, g.country) {
                    (Some(c), Some(co)) => format!("{c}, {co}"),
                    (None, Some(co)) => co,
                    _ => "Home".into(),
                };
                return HomeLocation {
                    lat,
                    lon,
                    label: override_label.unwrap_or(label),
                };
            }
        }

        HomeLocation {
            lat: 37.7749,
            lon: -122.4194,
            label: override_label.unwrap_or_else(|| "Home (approx)".into()),
        }
    }
}
