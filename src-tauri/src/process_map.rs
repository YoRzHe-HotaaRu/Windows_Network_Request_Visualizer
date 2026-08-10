//! Windows TCP/UDP connection → PID → process name mapping.

use crate::flow::FlowKey;
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct SocketOwner {
    pub local_ip: String,
    pub local_port: u16,
    pub remote_ip: String,
    pub remote_port: u16,
    pub protocol: String,
    pub pid: u32,
    pub process_name: Option<String>,
}

#[cfg(windows)]
pub fn list_connections() -> Vec<SocketOwner> {
    windows_impl::list_connections()
}

#[cfg(not(windows))]
pub fn list_connections() -> Vec<SocketOwner> {
    Vec::new()
}

pub fn owners_by_remote(list: &[SocketOwner]) -> HashMap<FlowKey, SocketOwner> {
    let mut map = HashMap::new();
    for s in list {
        if s.remote_ip == "0.0.0.0"
            || s.remote_ip == "::"
            || s.remote_ip.is_empty()
            || s.remote_port == 0
        {
            continue;
        }
        // Skip pure listen placeholders
        if s.remote_ip == "0.0.0.0" || s.remote_ip == "::" {
            continue;
        }
        let key = FlowKey {
            src_ip: s.local_ip.clone(),
            src_port: s.local_port,
            dst_ip: s.remote_ip.clone(),
            dst_port: s.remote_port,
            protocol: s.protocol.clone(),
        };
        map.insert(key, s.clone());
    }
    map
}

#[cfg(windows)]
mod windows_impl {
    use super::SocketOwner;
    use std::collections::HashMap;
    use std::net::{Ipv4Addr, Ipv6Addr};
    use windows::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE, NO_ERROR, WIN32_ERROR};
    use windows::Win32::NetworkManagement::IpHelper::{
        GetExtendedTcpTable, MIB_TCP6ROW_OWNER_PID, MIB_TCP6TABLE_OWNER_PID, MIB_TCPROW_OWNER_PID,
        MIB_TCPTABLE_OWNER_PID, TCP_TABLE_OWNER_PID_ALL,
    };
    use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::core::PWSTR;

    /// Snapshot of pid → executable file name (no OpenProcess required).
    fn process_table() -> HashMap<u32, String> {
        let mut map = HashMap::new();
        map.insert(0, "System".into());
        map.insert(4, "System".into());

        unsafe {
            let snap = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
                Ok(h) if h != INVALID_HANDLE_VALUE => h,
                _ => return map,
            };

            let mut entry = PROCESSENTRY32W {
                dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
                ..Default::default()
            };

            if Process32FirstW(snap, &mut entry).is_ok() {
                loop {
                    let name = {
                        let raw = &entry.szExeFile;
                        let len = raw.iter().position(|&c| c == 0).unwrap_or(raw.len());
                        String::from_utf16_lossy(&raw[..len])
                    };
                    if !name.is_empty() {
                        map.insert(entry.th32ProcessID, name);
                    }
                    if Process32NextW(snap, &mut entry).is_err() {
                        break;
                    }
                }
            }
            let _ = CloseHandle(snap);
        }
        map
    }

    fn process_name_from_handle(pid: u32) -> Option<String> {
        if pid == 0 || pid == 4 {
            return Some("System".into());
        }
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 512];
            let mut size = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_WIN32,
                PWSTR(buf.as_mut_ptr()),
                &mut size,
            );
            let _ = CloseHandle(handle);
            if ok.is_err() || size == 0 {
                return None;
            }
            let path = String::from_utf16_lossy(&buf[..size as usize]);
            let base = path
                .rsplit(['\\', '/'])
                .next()
                .unwrap_or(&path)
                .to_string();
            if base.is_empty() {
                None
            } else {
                Some(base)
            }
        }
    }

    fn resolve_name(pid: u32, table: &HashMap<u32, String>) -> Option<String> {
        if let Some(n) = table.get(&pid) {
            return Some(n.clone());
        }
        process_name_from_handle(pid)
    }

    fn u32_to_ipv4(addr: u32) -> String {
        // MIB tables store IPv4 in network byte order on little-endian Windows
        let b = addr.to_ne_bytes();
        Ipv4Addr::new(b[0], b[1], b[2], b[3]).to_string()
    }

    fn port_nbo(p: u32) -> u16 {
        u16::from_be((p & 0xFFFF) as u16)
    }

    fn ok_win(code: u32) -> bool {
        WIN32_ERROR(code) == NO_ERROR
    }

    pub fn list_connections() -> Vec<SocketOwner> {
        let names = process_table();
        let mut out = Vec::new();
        out.extend(tcp4());
        out.extend(tcp6());
        // UDP has no remote endpoint in the owner table — skip for destination map

        for s in &mut out {
            s.process_name = resolve_name(s.pid, &names);
        }
        out
    }

    fn tcp4() -> Vec<SocketOwner> {
        unsafe {
            let mut size = 0u32;
            // ALL includes established + other states with remotes
            let _ = GetExtendedTcpTable(
                None,
                &mut size,
                false,
                AF_INET.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );
            if size == 0 {
                return vec![];
            }
            let mut buf = vec![0u8; size as usize];
            let code = GetExtendedTcpTable(
                Some(buf.as_mut_ptr() as *mut _),
                &mut size,
                false,
                AF_INET.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );
            if !ok_win(code) {
                return vec![];
            }
            let table = &*(buf.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
            let count = table.dwNumEntries as usize;
            let rows_ptr = std::ptr::addr_of!(table.table) as *const MIB_TCPROW_OWNER_PID;
            let mut out = Vec::with_capacity(count);
            for i in 0..count {
                let row = *rows_ptr.add(i);
                let remote_ip = u32_to_ipv4(row.dwRemoteAddr);
                let remote_port = port_nbo(row.dwRemotePort);
                if remote_port == 0 || remote_ip == "0.0.0.0" {
                    continue;
                }
                out.push(SocketOwner {
                    local_ip: u32_to_ipv4(row.dwLocalAddr),
                    local_port: port_nbo(row.dwLocalPort),
                    remote_ip,
                    remote_port,
                    protocol: "TCP".into(),
                    pid: row.dwOwningPid,
                    process_name: None,
                });
            }
            out
        }
    }

    fn tcp6() -> Vec<SocketOwner> {
        unsafe {
            let mut size = 0u32;
            let _ = GetExtendedTcpTable(
                None,
                &mut size,
                false,
                AF_INET6.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );
            if size == 0 {
                return vec![];
            }
            let mut buf = vec![0u8; size as usize];
            let code = GetExtendedTcpTable(
                Some(buf.as_mut_ptr() as *mut _),
                &mut size,
                false,
                AF_INET6.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );
            if !ok_win(code) {
                return vec![];
            }
            let table = &*(buf.as_ptr() as *const MIB_TCP6TABLE_OWNER_PID);
            let count = table.dwNumEntries as usize;
            let rows_ptr = std::ptr::addr_of!(table.table) as *const MIB_TCP6ROW_OWNER_PID;
            let mut out = Vec::with_capacity(count);
            for i in 0..count {
                let row = *rows_ptr.add(i);
                let remote = Ipv6Addr::from(row.ucRemoteAddr).to_string();
                let remote_port = port_nbo(row.dwRemotePort);
                if remote_port == 0 || remote == "::" {
                    continue;
                }
                out.push(SocketOwner {
                    local_ip: Ipv6Addr::from(row.ucLocalAddr).to_string(),
                    local_port: port_nbo(row.dwLocalPort),
                    remote_ip: remote,
                    remote_port,
                    protocol: "TCP".into(),
                    pid: row.dwOwningPid,
                    process_name: None,
                });
            }
            out
        }
    }
}
