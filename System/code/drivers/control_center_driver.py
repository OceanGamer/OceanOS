import subprocess
import json
import sys
import time
from network_driver import get_network_status, toggle_adapter
from bluetooth_driver import get_bluetooth_status, toggle_bluetooth
from airplane_driver import get_airplane_status, toggle_airplane

def run_powershell_command(command):
    try:
        process = subprocess.Popen(
            ['powershell.exe', '-Command', command],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        return {"success": process.returncode == 0, "stdout": stdout, "stderr": stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}

def handle_control_click(control_type):
    try:
        if control_type == "wifi":
            # Obtener el estado actual de la red
            status = get_network_status()
            if status and status.get("adapter"):
                # Toggle del adaptador actual
                result = toggle_adapter(status["adapter"])
                # Esperar un momento para que el cambio tome efecto
                time.sleep(1)
                return get_network_status()
            return {"error": "No adapter found", "status": "disabled"}
            
        elif control_type == "bluetooth":
            # Primero intentamos obtener el nombre real del adaptador Bluetooth
            result = run_powershell_command("Get-NetAdapter | Where-Object { $_.Name -like '*Bluetooth*' } | Select-Object -ExpandProperty Name")
            if result["success"] and result["stdout"].strip():
                adapter_name = result["stdout"].strip()
                # Toggle del adaptador Bluetooth
                current_status = get_bluetooth_status()
                if current_status and current_status.get("active"):
                    run_powershell_command(f"Disable-NetAdapter -Name '{adapter_name}' -Confirm:$false")
                else:
                    run_powershell_command(f"Enable-NetAdapter -Name '{adapter_name}' -Confirm:$false")
                # Esperar un momento para que el cambio tome efecto
                time.sleep(1)
                return get_bluetooth_status()
            else:
                # Si no encontramos el adaptador, intentamos con el servicio
                current_status = get_bluetooth_status()
                if current_status and current_status.get("active"):
                    run_powershell_command("Stop-Service bthserv -Force")
                else:
                    run_powershell_command("Start-Service bthserv")
                time.sleep(1)
                return get_bluetooth_status()
            
        elif control_type == "airplane":
            # Toggle del modo avión
            result = toggle_airplane()
            # Esperar un momento para que los cambios tomen efecto
            time.sleep(1)
            return get_airplane_status()
            
        else:
            return {"error": "Invalid control type", "status": "error"}
            
    except Exception as e:
        return {"error": str(e), "status": "error"}

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            control_type = sys.argv[1]
            result = handle_control_click(control_type)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "Control type required", "status": "error"}))
    except Exception as e:
        print(json.dumps({"error": str(e), "status": "error"})) 