import type { AppStatus, FlowSnapshot, FlowRecord } from "../types/ipc";

const CITIES: { city: string; country: string; lat: number; lon: number }[] = [
  { city: "Ashburn", country: "United States", lat: 39.0438, lon: -77.4874 },
  { city: "Frankfurt", country: "Germany", lat: 50.1109, lon: 8.6821 },
  { city: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { city: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333 },
  { city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { city: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
  { city: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  { city: "Dublin", country: "Ireland", lat: 53.3498, lon: -6.2603 },
];

const PROCESSES = [
  "chrome.exe",
  "discord.exe",
  "Spotify.exe",
  "Code.exe",
  "msedge.exe",
  "steam.exe",
  "OneDrive.exe",
  "firefox.exe",
];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function startBrowserDemo(
  setSnapshot: (s: FlowSnapshot) => void,
  setStatus: (s: AppStatus) => void
) {
  const home = { lat: 37.7749, lon: -122.4194, label: "San Francisco, US" };
  const flows = new Map<string, FlowRecord>();

  setStatus({
    status: "demo",
    message: "Browser demo mode (run via Tauri for live capture)",
    elevated: false,
    npcapAvailable: false,
    geoReady: true,
    settings: {
      interfaceId: null,
      idleTimeoutSecs: 45,
      topN: 80,
      snapshotMs: 400,
      demoMode: true,
      firstRunComplete: true,
    },
  });

  const tick = () => {
    const now = Date.now();
    // spawn
    if (Math.random() > 0.35 || flows.size < 6) {
      const c = pick(CITIES);
      const id = `${c.city}-${Math.floor(Math.random() * 9999)}`;
      const rate = rand(5_000, 2_500_000);
      flows.set(id, {
        id,
        protocol: Math.random() > 0.2 ? "TCP" : "UDP",
        srcIp: "192.168.1.20",
        srcPort: Math.floor(rand(49152, 65000)),
        dstIp: `${Math.floor(rand(1, 223))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(1, 254))}`,
        dstPort: pick([443, 80, 853, 5222, 3478]),
        bytesUp: Math.floor(rate * rand(0.2, 0.8)),
        bytesDown: Math.floor(rate * rand(0.5, 3)),
        packets: Math.floor(rand(10, 4000)),
        rateBps: rate,
        pid: Math.floor(rand(1000, 20000)),
        processName: pick(PROCESSES),
        remoteCity: c.city,
        remoteCountry: c.country,
        remoteLat: c.lat + rand(-0.2, 0.2),
        remoteLon: c.lon + rand(-0.2, 0.2),
        firstSeen: now - Math.floor(rand(1000, 60000)),
        lastSeen: now,
        isPrivateRemote: false,
      });
    }

    // update / drop
    for (const [id, f] of [...flows.entries()]) {
      if (Math.random() > 0.92) {
        flows.delete(id);
        continue;
      }
      const rate = f.rateBps * rand(0.7, 1.3);
      flows.set(id, {
        ...f,
        rateBps: rate,
        bytesUp: f.bytesUp + Math.floor(rate * 0.1),
        bytesDown: f.bytesDown + Math.floor(rate * 0.25),
        packets: f.packets + Math.floor(rand(1, 40)),
        lastSeen: now,
      });
    }

    const list = [...flows.values()].sort((a, b) => b.rateBps - a.rateBps);
    const bpsUp = list.reduce((s, f) => s + f.rateBps * 0.25, 0);
    const bpsDown = list.reduce((s, f) => s + f.rateBps * 0.75, 0);
    const destinations = new Set(list.map((f) => f.remoteCountry || f.dstIp)).size;

    setSnapshot({
      ts: now,
      status: "demo",
      message: "Demo traffic",
      mode: "demo",
      home,
      totals: {
        flows: list.length,
        bpsUp,
        bpsDown,
        destinations,
      },
      flows: list,
    });
  };

  tick();
  return window.setInterval(tick, 700);
}
