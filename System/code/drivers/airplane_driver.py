import subprocess
import json
import sys
from network_driver import get_network_status
from bluetooth_driver import get_bluetooth_status

def enable_airplane():
    errors = []
    try:
        subprocess.check_call("netsh interface set interface name=\"Wi-Fi\" admin=disable", shell=True)
    except Exception as e:
        errors.append("WiFi: " + str(e))
    try:
        subprocess.check_call("powershell.exe -Command \"Stop-Service bthserv -Force\"", shell=True)
    except Exception as e:
        errors.append("Bluetooth: " + str(e))
    return {"active": True, "errors": errors}

def disable_airplane():
    errors = []
    try:
        subprocess.check_call("netsh interface set interface name=\"Wi-Fi\" admin=enable", shell=True)
    except Exception as e:
        errors.append("WiFi: " + str(e))
    try:
        subprocess.check_call("powershell.exe -Command \"Start-Service bthserv\"", shell=True)
    except Exception as e:
        errors.append("Bluetooth: " + str(e))
    return {"active": False, "errors": errors}

def get_airplane_status():
    net_status = get_network_status()
    bt_status = get_bluetooth_status()
    # Se considera que el modo avión está activado si Wi‑Fi está deshabilitado y Bluetooth no está activo
    airplane = (not net_status.get("isEnabled")) and (not bt_status.get("active"))
    return {"active": airplane}

def toggle_airplane():
    status = get_airplane_status()
    if status.get("active"):
        return disable_airplane()
    else:
        return enable_airplane()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(get_airplane_status()))
    elif sys.argv[1] == "toggle":
        print(json.dumps(toggle_airplane()))
