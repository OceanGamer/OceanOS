import json
import psutil
import subprocess
import sys

def get_network_info():
    try:
        # Obtener todas las interfaces de red con su estado físico y tipo
        cmd = 'powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object Name,InterfaceDescription,MediaConnectionState,InterfaceType"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        # Inicializar estados
        lan_connected = False
        wifi_connected = False
        internet_connected = False
        
        # Procesar la salida de PowerShell
        if result.stdout.strip():
            lines = result.stdout.split('\n')[2:]  # Saltar las líneas de encabezado
            for line in lines:
                if line.strip():
                    parts = line.split()
                    interface_name = parts[0].strip()
                    # Verificar el estado físico de la conexión
                    media_state = ' '.join(parts[2:]).strip() if len(parts) > 2 else ''
                    
                    # Excluir interfaces virtuales y VPNs
                    if any(virtual in interface_name.lower() for virtual in ['virtual', 'vpn', 'tunnel', 'tap', 'loopback']):
                        continue
                        
                    if 'Wi-Fi' in interface_name or 'Wireless' in interface_name:
                        wifi_connected = True
                    elif 'Ethernet' in interface_name or 'LAN' in interface_name:
                        # Solo considerar Ethernet conectado si está físicamente conectado
                        if 'Connected' in media_state:
                            lan_connected = True
        
        # Verificar conectividad a Internet
        try:
            # Intentar hacer un ping a un servidor DNS
            subprocess.check_output(['ping', '-n', '1', '8.8.8.8'], timeout=1)
            internet_connected = True
        except:
            internet_connected = False

        # Si no hay interfaces activas, verificar si hay alguna red guardada
        if not (lan_connected or wifi_connected):
            cmd = 'powershell -Command "Get-NetConnectionProfile | Where-Object {$_.IPv4Connectivity -eq \'Internet\'} | Select-Object -First 1"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.stdout.strip():
                # Si hay un perfil de red con Internet, probablemente es WiFi
                wifi_connected = True

        return {
            "status": True,
            "ethernet": lan_connected,
            "wifi": wifi_connected,
            "internet": internet_connected
        }
    except Exception as e:
        return {
            "status": False,
            "error": str(e)
        }

def toggle_adapter(adapter_name):
    try:
        # Obtener todas las interfaces activas (excluyendo virtuales)
        cmd = 'powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\' -and $_.Name -notlike \'*Virtual*\' -and $_.Name -notlike \'*VPN*\' -and $_.Name -notlike \'*Tunnel*\' -and $_.Name -notlike \'*TAP*\'} | Select-Object Name"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout.strip():
            lines = result.stdout.split('\n')[2:]  # Saltar las líneas de encabezado
            for line in lines:
                if line.strip():
                    adapter = line.strip()
                    # Cambiar estado del adaptador
                    toggle_cmd = f'powershell -Command "Disable-NetAdapter -Name \'{adapter}\' -Confirm:$false"'
                    subprocess.run(toggle_cmd, shell=True, capture_output=True)
                    
                    # Esperar un momento y volver a habilitar
                    import time
                    time.sleep(2)
                    
                    toggle_cmd = f'powershell -Command "Enable-NetAdapter -Name \'{adapter}\' -Confirm:$false"'
                    subprocess.run(toggle_cmd, shell=True, capture_output=True)
        
        return get_network_info()
    except Exception as e:
        return {
            "status": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "toggle":
        print(json.dumps(toggle_adapter(None)))
    else:
        print(json.dumps(get_network_info()))
