/** Friendly labels for processes + well-known ports */

const FRIENDLY: Record<string, string> = {
  "chrome.exe": "Google Chrome",
  "msedge.exe": "Microsoft Edge",
  "firefox.exe": "Firefox",
  "brave.exe": "Brave",
  "opera.exe": "Opera",
  "discord.exe": "Discord",
  "discordptb.exe": "Discord PTB",
  "discordcanary.exe": "Discord Canary",
  "spotify.exe": "Spotify",
  "code.exe": "VS Code",
  "code - insiders.exe": "VS Code Insiders",
  "devenv.exe": "Visual Studio",
  "steam.exe": "Steam",
  "steamwebhelper.exe": "Steam",
  "slack.exe": "Slack",
  "teams.exe": "Microsoft Teams",
  "ms-teams.exe": "Microsoft Teams",
  "outlook.exe": "Outlook",
  "onedrive.exe": "OneDrive",
  "dropbox.exe": "Dropbox",
  "notion.exe": "Notion",
  "zoom.exe": "Zoom",
  "telegram.exe": "Telegram",
  "whatsapp.exe": "WhatsApp",
  "signal.exe": "Signal",
  "svchost.exe": "Windows Service Host",
  "system": "Windows System",
  "services.exe": "Windows Services",
  "lsass.exe": "Local Security Authority",
  "csrss.exe": "Client Server Runtime",
  "explorer.exe": "Windows Explorer",
  "searchhost.exe": "Windows Search",
  "runtimebroker.exe": "Runtime Broker",
  "dwm.exe": "Desktop Window Manager",
  "node.exe": "Node.js",
  "python.exe": "Python",
  "pythonw.exe": "Python",
  "java.exe": "Java",
  "javaw.exe": "Java",
  "curl.exe": "curl",
  "git.exe": "Git",
  "powershell.exe": "PowerShell",
  "pwsh.exe": "PowerShell",
  "cmd.exe": "Command Prompt",
  "wsl.exe": "WSL",
  "docker.exe": "Docker",
  "com.docker.backend.exe": "Docker",
  "vpnui.exe": "Cisco AnyConnect",
  "openvpn.exe": "OpenVPN",
  "wireguard.exe": "WireGuard",
  "obs64.exe": "OBS Studio",
  "obs32.exe": "OBS Studio",
  "gameoverlayui64.exe": "Steam Overlay",
  "nvidia web helper.exe": "NVIDIA",
  "nvcontainer.exe": "NVIDIA",
  "adobe desktop service.exe": "Adobe",
  "creative cloud.exe": "Adobe Creative Cloud",
  "winstore.desktop.exe": "Microsoft Store",
  "applicationframehost.exe": "Windows App",
  "shellhost.exe": "Windows Shell",
  "smartscreen.exe": "Windows SmartScreen",
  "securityhealthservice.exe": "Windows Security",
  "msmpeng.exe": "Windows Defender",
  "searchindexer.exe": "Windows Search Indexer",
  "taskhostw.exe": "Windows Task Host",
  "sihost.exe": "Shell Infrastructure",
  "ctfmon.exe": "Text Input",
  "fontdrvhost.exe": "Font Driver Host",
  "conhost.exe": "Console Host",
  "dllhost.exe": "COM Surrogate",
  "wmiadap.exe": "WMI",
  "wmiprvse.exe": "WMI Provider",
  "backgroundtaskhost.exe": "Background Task Host",
  "phoneexperiencehost.exe": "Phone Link",
  "yourphone.exe": "Phone Link",
  "widgets.exe": "Windows Widgets",
  "widgetservice.exe": "Windows Widgets",
  "copilot.exe": "Microsoft Copilot",
  "chatgpt.exe": "ChatGPT",
  "claude.exe": "Claude",
};

const PORT_SERVICE: Record<number, string> = {
  20: "FTP data",
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  110: "POP3",
  123: "NTP",
  143: "IMAP",
  443: "HTTPS",
  465: "SMTPS",
  587: "SMTP submit",
  853: "DoT DNS",
  993: "IMAPS",
  995: "POP3S",
  1194: "OpenVPN",
  1433: "SQL Server",
  1521: "Oracle",
  3306: "MySQL",
  3389: "RDP",
  5432: "PostgreSQL",
  5900: "VNC",
  6379: "Redis",
  8080: "HTTP-alt",
  8443: "HTTPS-alt",
  27017: "MongoDB",
  5222: "XMPP",
  5223: "Apple Push",
  5228: "Google services",
  3478: "STUN/TURN",
  19302: "Google STUN",
  6667: "IRC",
  25565: "Minecraft",
};

export function stripExe(name: string): string {
  return name.replace(/\.exe$/i, "");
}

export function friendlyProcessName(
  processName?: string | null,
  pid?: number | null
): string {
  if (pid === 0) return "Windows System";
  if (pid === 4) return "Windows Kernel";
  if (!processName || !processName.trim()) {
    return pid != null ? `Process ${pid}` : "Unknown app";
  }
  const raw = processName.trim();
  const key = raw.toLowerCase();
  if (FRIENDLY[key]) return FRIENDLY[key];
  // drop path if any
  const base = raw.split(/[/\\]/).pop() || raw;
  const baseKey = base.toLowerCase();
  if (FRIENDLY[baseKey]) return FRIENDLY[baseKey];
  // Title-case without .exe
  const noExt = stripExe(base);
  if (noExt === noExt.toUpperCase() && noExt.length <= 8) return noExt;
  return noExt;
}

export function portService(port: number): string | null {
  return PORT_SERVICE[port] ?? null;
}

/** Primary line for feed: app name, with service hint if useful */
export function flowAppLabel(
  processName?: string | null,
  pid?: number | null,
  dstPort?: number
): string {
  const app = friendlyProcessName(processName, pid);
  const svc = dstPort != null ? portService(dstPort) : null;
  const unknown =
    !processName ||
    processName.toLowerCase() === "unknown" ||
    processName.toLowerCase() === "system";
  if (unknown && svc) return `${app} · ${svc}`;
  if (svc && (dstPort === 443 || dstPort === 80 || dstPort === 853)) {
    // still show app; service is secondary in subtitle
    return app;
  }
  return app;
}

export function flowServiceHint(dstPort: number): string | null {
  return portService(dstPort);
}
