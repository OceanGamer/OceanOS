async function executeSystemCommand(bash) {
    // Dividir el bash en comando y argumento (separados por el primer espacio)
    const [command, ...args] = bash.trim().split(/\s+/);
    const argument = args.join(' '); // Unir los argumentos restantes por si había más espacios

    try {
        let response;
        
        switch (command.toLowerCase()) {
            case "help":
                response = `
                Comandos Disponibles:
                - ls [ubicacion] - Muestra el contenido dentro de una ubicación.
                - rf [ubicacion] - Lee el contenido de un archivo.
                - wf [ubicacion | contenido] - Modifica el contenido de un archivo.
                - fe [ubicacion] - Verifica si un archivo existe.
                - de [ubicacion] - Verifica si un directorio existe.
                - gvolume - Obtiene el volumen y estado de silencio del sistema.
                - gwifi - Obtiene el estado del WiFi y conexión a internet.
                - gthernet - Obtiene el estado de la conexión Ethernet.
                - gbluetooth - Obtiene el estado del Bluetooth.
                - gbattery - Obtiene el estado de la batería.
                - cls - Limpia la terminal
                - ps - Lista procesos activos
                - ps start [app] - Inicia una aplicación
                - ps kill [pid] - Termina un proceso
                `;
                break;

            case "ls":
                response = await window.systemAPI.executeBash(`ls ${argument || ''}`.trim());
                break;

            case "rf":
                response = await window.systemAPI.executeBash(`cat ${argument}`);
                break;
                    
            case "wf":
                const [filePath, content] = argument.split('|').map(s => s.trim());
                response = await window.systemAPI.executeBash(`echo '${content}' > ${filePath}`);
                break;
                    
            case "fe":
                response = await window.systemAPI.executeBash(`[ -f "${argument}" ] && echo "true" || echo "false"`);
                break;
                    
            case "de":
                response = await window.systemAPI.executeBash(`[ -d "${argument}" ] && echo "true" || echo "false"`);
                break;

            case "gvolume":
                response = await window.systemAPI.executeBash(`
                    volume=$(amixer get Master | grep -oE '[0-9]+%' | head -1 | tr -d '%');
                    muted=$(amixer get Master | grep -oE '\[off\]' | head -1);
                    echo "{\\"level\\": \\"$volume\\", \\"muted\\": \\"$muted\\"}"
                `);
                break;

            case "gwifi":
                response = await window.systemAPI.executeBash(`
                    wifi_status=$(nmcli radio wifi);
                    internet_status=$(ping -c 1 google.com &> /dev/null && echo "true" || echo "false");
                    echo "{\\"wifi\\": \\"$wifi_status\\", \\"internet\\": \\"$internet_status\\"}"
                `);
                break;
            
            case "gethernet":
                response = await window.systemAPI.executeBash(`
                    ethernet_status=$(ip link show eth0 | grep -q "state UP" && echo "true" || echo "false");
                    internet_status=$(ping -c 1 google.com &> /dev/null && echo "true" || echo "false");
                    echo "{\\"ethernet\\": \\"$ethernet_status\\", \\"internet\\": \\"$internet_status\\"}"
                `);
                break;
                
            case "gbluetooth":
                response = await window.systemAPI.executeBash(`
                    bluetooth_status=$(bluetoothctl show | grep -q "Powered: yes" && echo "true" || echo "false");
                    echo "{\\"enabled\\": \\"$bluetooth_status\\"}"
                `);
                break;

            case "gbattery":
                response = await window.systemAPI.executeBash(`
                    # Verificar si existe batería
                    if [ -d /sys/class/power_supply/BAT* ]; then
                        battery_path=$(ls /sys/class/power_supply/ | grep BAT | head -1);
                        battery_percent=$(cat /sys/class/power_supply/$battery_path/capacity);
                        power_plugged=$(cat /sys/class/power_supply/AC/online);
                        echo "{\\"has_battery\\": true, \\"percent\\": \\"$battery_percent\\", \\"power_plugged\\": \\"$power_plugged\\"}";
                    else
                        # Solo fuente de poder (sin batería)
                        power_plugged=$(cat /sys/class/power_supply/AC/online 2>/dev/null || echo "1");
                        echo "{\\"has_battery\\": false, \\"power_plugged\\": \\"$power_plugged\\"}";
                    fi
                `);
                break;

            case "cls":
                response = { special: "clear-terminal" };
                break;

            case "ps":
                if (!argument) {
                    // Listar procesos
                    response = JSON.stringify(window.ProcessManager.getProcesses(), null, 2);
                } else if (args[0] === "start" && args[1]) {
                    // Iniciar proceso
                    const packageName = args[1];
                    await window.ProcessManager.startProcess(packageName);
                    response = `Aplicación ${packageName} iniciada`;
                } else if (args[0] === "kill" && args[1]) {
                    // Terminar proceso
                    const pid = parseInt(args[1]);
                    window.ProcessManager.killProcess(pid);
                    response = `Proceso ${pid} terminado`;
                } else {
                    response = "Uso: ps [start|kill] [nombre/pid]";
                }
                break;
            
                
            // Añade más comandos según necesites
            default:
                response = `Error: Comando '${command}' no reconocido. Escribe 'help' para ver los comandos disponibles.`;
        }
        
        return response;
        
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

// Exponer la función executeSystemCommand en el ámbito global
window.systemAPI = {
    executeSystemCommand: executeSystemCommand
};

// Manejar mensajes desde iframes
window.addEventListener('message', async (event) => {
    if (event.data.type === 'systemAPI-command') {
        const { command, messageId } = event.data;
        
        try {
            const response = await executeSystemCommand(command);
            event.source.postMessage({
                type: 'systemAPI-response',
                messageId: messageId,
                response: response
            }, '*');
        } catch (error) {
            event.source.postMessage({
                type: 'systemAPI-response',
                messageId: messageId,
                error: error.message
            }, '*');
        }
    }
});