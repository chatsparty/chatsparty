#!/usr/bin/env python3
"""
Monitoring agent that runs inside Docker containers to collect system metrics
This provides much more reliable and detailed information than parsing /proc files
"""

import json
import sys
import traceback
from typing import Dict, Any, List


def get_active_ports() -> Dict[int, Dict[str, Any]]:
    """Get all active listening ports using psutil (much more reliable than /proc parsing)"""
    try:
        import psutil
    except ImportError:
        return get_active_ports_fallback()
    
    active_ports = {}
    
    try:
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == psutil.CONN_LISTEN and conn.laddr.port > 1024:
                port = conn.laddr.port
                
                try:
                    if conn.pid:
                        process = psutil.Process(conn.pid)
                        process_name = process.name()
                        cmdline = ' '.join(process.cmdline()[:3])
                        cpu_percent = process.cpu_percent()
                        memory_info = process.memory_info()
                        memory_mb = memory_info.rss / 1024 / 1024
                    else:
                        process_name = "unknown"
                        cmdline = "unknown"
                        cpu_percent = 0.0
                        memory_mb = 0.0
                    
                    active_ports[port] = {
                        "port": port,
                        "process": process_name,
                        "process_id": conn.pid,
                        "cmdline": cmdline,
                        "cpu_percent": cpu_percent,
                        "memory_mb": round(memory_mb, 2),
                        "address": f"{conn.laddr.ip}:{conn.laddr.port}",
                        "service_name": f"{process_name}:{port}",
                        "status": "running"
                    }
                    
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    active_ports[port] = {
                        "port": port,
                        "process": "unknown",
                        "process_id": conn.pid,
                        "cmdline": "unknown",
                        "cpu_percent": 0.0,
                        "memory_mb": 0.0,
                        "address": f"{conn.laddr.ip}:{conn.laddr.port}",
                        "service_name": f"service:{port}",
                        "status": "running"
                    }
                    
    except Exception as e:
        return get_active_ports_fallback()
    
    return active_ports


def get_active_ports_fallback() -> Dict[int, Dict[str, Any]]:
    """Fallback to /proc/net/tcp parsing if psutil fails"""
    active_ports = {}
    
    try:
        with open('/proc/net/tcp', 'r') as f:
            lines = f.readlines()[1:]
            
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 4 and parts[3] == '0A':
                try:
                    local_address = parts[1]
                    port_hex = local_address.split(':')[1]
                    port = int(port_hex, 16)
                    
                    if port > 1024:
                        active_ports[port] = {
                            "port": port,
                            "process": "unknown",
                            "process_id": None,
                            "cmdline": "unknown",
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "address": f"0.0.0.0:{port}",
                            "service_name": f"service:{port}",
                            "status": "running"
                        }
                except ValueError:
                    continue
                    
    except Exception:
        pass
    
    return active_ports


def get_system_metrics() -> Dict[str, Any]:
    """Get overall system metrics"""
    try:
        import psutil
        
        return {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_available_mb": psutil.virtual_memory().available / 1024 / 1024,
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0.0, 0.0, 0.0]
        }
    except ImportError:
        return {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "memory_available_mb": 0.0,
            "disk_usage_percent": 0.0,
            "load_average": [0.0, 0.0, 0.0]
        }
    except Exception:
        return {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "memory_available_mb": 0.0,
            "disk_usage_percent": 0.0,
            "load_average": [0.0, 0.0, 0.0]
        }


def get_running_processes() -> List[Dict[str, Any]]:
    """Get list of running processes (limited to avoid too much data)"""
    try:
        import psutil
        
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                proc_info = proc.info
                if proc_info['cpu_percent'] > 1.0 or proc_info['memory_percent'] > 1.0:
                    processes.append({
                        "pid": proc_info['pid'],
                        "name": proc_info['name'],
                        "cpu_percent": proc_info['cpu_percent'],
                        "memory_percent": proc_info['memory_percent']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
        
    except ImportError:
        return []
    except Exception:
        return []


def main():
    """Main function that returns complete monitoring data as JSON"""
    try:
        monitoring_data = {
            "active_ports": get_active_ports(),
            "system_metrics": get_system_metrics(),
            "top_processes": get_running_processes(),
            "agent_version": "1.0.0",
            "timestamp": str(__import__('datetime').datetime.utcnow()),
            "psutil_available": True
        }
        
        try:
            import psutil
        except ImportError:
            monitoring_data["psutil_available"] = False
            
    except Exception as e:
        monitoring_data = {
            "active_ports": {},
            "system_metrics": {},
            "top_processes": [],
            "agent_version": "1.0.0",
            "timestamp": str(__import__('datetime').datetime.utcnow()),
            "psutil_available": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
    
    print(json.dumps(monitoring_data, indent=2))


if __name__ == "__main__":
    main()