mod engine;
mod flow;
mod geo;
mod models;
mod process_map;

use engine::{save_settings, Engine};
use geo::GeoService;
use models::{AppSettings, AppStatus, NetInterface};
use std::sync::Arc;
use tauri::State;

struct AppState {
    engine: Arc<Engine>,
}

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> AppStatus {
    state.engine.app_status()
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> AppSettings {
    state.engine.settings.read().clone()
}

#[tauri::command]
fn update_settings(state: State<'_, AppState>, partial: serde_json::Value) -> Result<AppSettings, String> {
    let mut current = state.engine.settings.read().clone();
    let cur_val = serde_json::to_value(&current).map_err(|e| e.to_string())?;
    let mut map = cur_val
        .as_object()
        .cloned()
        .ok_or_else(|| "INTERNAL: settings not object".to_string())?;
    if let Some(p) = partial.as_object() {
        for (k, v) in p {
            map.insert(k.clone(), v.clone());
        }
    }
    current = serde_json::from_value(serde_json::Value::Object(map)).map_err(|e| e.to_string())?;
    if let Some(path) = current.geo_db_path.clone() {
        let _ = state.engine.geo.load_db(&path);
    }
    save_settings(&current);
    *state.engine.settings.write() = current.clone();
    Ok(current)
}

#[tauri::command]
async fn start_capture(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<AppStatus, String> {
    state.engine.start(app).await;
    Ok(state.engine.app_status())
}

#[tauri::command]
async fn stop_capture(state: State<'_, AppState>) -> Result<AppStatus, String> {
    state.engine.stop().await;
    Ok(state.engine.app_status())
}

#[tauri::command]
fn list_interfaces() -> Vec<NetInterface> {
    vec![NetInterface {
        id: "default".into(),
        name: "Primary".into(),
        description: Some("Default active interface".into()),
    }]
}

#[tauri::command]
async fn resolve_home(state: State<'_, AppState>) -> Result<models::HomeLocation, String> {
    let s = state.engine.settings.read().clone();
    let home = state
        .engine
        .geo
        .resolve_home(s.home_lat, s.home_lon, s.home_label)
        .await;
    *state.engine.home.write() = home.clone();
    Ok(home)
}

#[tauri::command]
fn complete_first_run(state: State<'_, AppState>) -> AppSettings {
    let mut s = state.engine.settings.read().clone();
    s.first_run_complete = true;
    save_settings(&s);
    *state.engine.settings.write() = s.clone();
    s
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .init();

    let geo = GeoService::new();
    let engine = Engine::new(geo);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState { engine })
        .invoke_handler(tauri::generate_handler![
            get_status,
            get_settings,
            update_settings,
            start_capture,
            stop_capture,
            list_interfaces,
            resolve_home,
            complete_first_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running Network Visualizer");
}
