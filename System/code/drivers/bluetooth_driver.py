import subprocess
import json
import sys

def get_bluetooth_status():
    try:
        # Obtener los adaptadores de red, incluyendo el de Bluetooth
        output = subprocess.check_output("powershell.exe -Command \"Get-NetAdapter | Where-Object { $_.Name -like '*Bluetooth*' }\"", shell=True, text=True)
        active = "Up" in output  # Verificar si está activo
        available = "Bluetooth" in output
    except Exception as e:
        active = False
        available = False
    return {"available": available, "active": active}


def toggle_bluetooth():
    status = get_bluetooth_status()
    try:
        if status.get("active"):
            subprocess.check_call("powershell.exe -Command \"Disable-NetAdapter -Name 'Bluetooth' -Confirm:$false\"", shell=True)
        else:
            subprocess.check_call("powershell.exe -Command \"Enable-NetAdapter -Name 'Bluetooth' -Confirm:$false\"", shell=True)
    except Exception as e:
        return {"error": str(e)}
    return get_bluetooth_status()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(get_bluetooth_status()))
    elif sys.argv[1] == "toggle":
        print(json.dumps(toggle_bluetooth()))
