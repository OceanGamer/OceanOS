class SystemAPI {
    constructor() {
        this.commands = new Map();
        this.appWindows = new Map(); // Mapeo de PID a ventanas
        this.clipboard = ''; // Almacenamiento temporal del portapapeles

        // Registrar comandos básicos del sistema
        this.registerCommand('help', this.cmdHelp.bind(this));
        this.registerCommand('clear', this.cmdClear.bind(this));
        this.registerCommand('ls', this.cmdLs.bind(this));
        this.registerCommand('ps', this.cmdPs.bind(this));
        this.registerCommand('kill', this.cmdKill.bind(this));
        this.registerCommand('open', this.cmdOpen.bind(this));
        this.registerCommand('echo', this.cmdEcho.bind(this));
        this.registerCommand('pwd', this.cmdPwd.bind(this));
        this.registerCommand('copy', this.cmdCopy.bind(this));
        this.registerCommand('paste', this.cmdPaste.bind(this));
        this.registerCommand('powershell', this.cmdPowershell.bind(this));

        // Escuchar mensajes de la terminal
        window.addEventListener('message', this.handleTerminalMessage.bind(this));
    }

    handleTerminalMessage(event) {
        if (event.data.type === 'terminal-command') {
            const command = event.data.command.trim();
            const commandName = command.split(' ')[0];
            
            // No crear procesos para comandos básicos
            const isBasicCommand = ['ps', 'help', 'pwd', 'ls', 'clear', 'echo', 'kill'].includes(commandName);
            
            this.executeCommand(command, {
                writeLine: (text) => {
                    event.source.postMessage({
                        type: 'command-response',
                        output: text
                    }, '*');
                },
                writeError: (text) => {
                    event.source.postMessage({
                        type: 'command-response',
                        error: text
                    }, '*');
                },
                writeSuccess: (text) => {
                    event.source.postMessage({
                        type: 'command-response',
                        success: text
                    }, '*');
                },
                clear: () => {
                    event.source.postMessage({
                        type: 'command-response',
                        clear: true
                    }, '*');
                }
            }).catch(error => {
                event.source.postMessage({
                    type: 'command-response',
                    error: error.message
                }, '*');
            });
        }
    }

    // Registro de comandos
    registerCommand(name, handler) {
        this.commands.set(name, handler);
    }

    // Ejecución de comandos
    async executeCommand(command, terminal) {
        const args = command.trim().split(/\s+/);
        const cmd = args[0].toLowerCase();
        const cmdArgs = args.slice(1);

        if (this.commands.has(cmd)) {
            try {
                await this.commands.get(cmd)(cmdArgs, terminal);
            } catch (error) {
                terminal.writeError(`Error ejecutando ${cmd}: ${error.message}`);
                throw error;
            }
        } else {
            terminal.writeError(`Comando no encontrado: ${cmd}`);
            throw new Error(`Comando no encontrado: ${cmd}`);
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ${seconds % 60}s`;
        }
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }

    // Comandos del sistema
    async cmdHelp(args, terminal) {
        terminal.writeLine('Comandos disponibles:');
        terminal.writeLine('  help               - Muestra esta ayuda');
        terminal.writeLine('  clear              - Limpia la terminal');
        terminal.writeLine('  ls                 - Lista archivos y directorios');
        terminal.writeLine('  ps                 - Muestra procesos en ejecución');
        terminal.writeLine('  kill [pid]         - Termina un proceso');
        terminal.writeLine('  open [app-package] - Abre una aplicación');
        terminal.writeLine('  echo [mensaje]     - Muestra un mensaje');
        terminal.writeLine('  pwd                - Muestra el directorio actual');
    }

    async cmdClear(args, terminal) {
        terminal.clear();
    }

    async cmdLs(args, terminal) {
        try {
            const path = args[0] || '.';
            // Usar Join-Path para manejar rutas correctamente
            const command = `
                $path = '${path}';
                if (Test-Path $path) {
                    $items = Get-ChildItem -Path $path | ForEach-Object {
                        @{
                            Name = $_.Name;
                            FullName = $_.FullName;
                            Attributes = $_.Attributes.value__;
                            Extension = $_.Extension;
                            IsDirectory = $_.PSIsContainer
                        }
                    }
                    if ($items) {
                        $items | ConvertTo-Json
                    } else {
                        "[]"
                    }
                } else {
                    Write-Error "Path not found: $path"
                }
            `;
            
            const result = await window.pythonAPI.executePowerShell(command);
            
            if (result.success) {
                try {
                    let files = JSON.parse(result.stdout);
                    // Si solo hay un archivo, convertirlo en array
                    if (!Array.isArray(files)) {
                        files = [files];
                    }

                    // Enviar la salida JSON completa al terminal
                    terminal.writeLine(JSON.stringify(files));

                    // También mostrar los nombres de manera legible
                    files.forEach(file => {
                        terminal.writeLine(`${file.IsDirectory ? '[DIR]' : '     '} ${file.Name}`);
                    });
                } catch (error) {
                    // Si no se puede parsear como JSON, mostrar la salida directa
                    terminal.writeLine(result.stdout);
                }
            } else {
                terminal.writeError(`Error al listar directorio: ${result.stderr}`);
            }
        } catch (error) {
            terminal.writeError(`Error: ${error.message}`);
        }
    }

    async cmdPs(args, terminal) {
        // Obtener procesos del appsManager
        const apps = Process;
        
        terminal.writeLine('PID    NOMBRE     TIEMPO           PAQUETE');
        terminal.writeLine('----------------------------------------------------');
        
        for (const process of apps) {
            const now = new Date();
            const created = new Date(process.created);
            const runtime = now - created;
            const timeStr = this.formatTime(runtime);
            
            // Formatear la línea de salida
            terminal.writeLine(
                `${process.pid.toString().padEnd(7)}${process.appName.slice(0,13).padEnd(14)}${timeStr.padEnd(14)}${process.packageName}`
            );
        }
    }

    async cmdKill(args, terminal) {
        if (!args.length) {
            terminal.writeError('Uso: kill <pid>');
            return;
        }

        const pid = parseInt(args[0]);
        
        // Buscar el proceso en el array Process
        const processIndex = Process.findIndex(p => p.pid === pid);
        
        if (processIndex !== -1) {
            // Usar closeProcess para terminar el proceso
            closeProcess(pid);
            terminal.writeLine(`Proceso ${pid} terminado correctamente`);
            return;
        }
        
        terminal.writeError(`No se encontró el proceso ${pid}`);
    }

    async cmdOpen(args, terminal) {
        if (!args.length) {
            terminal.writeError('Uso: open <app_id>');
            return;
        }

        const appId = args[0];
        try {
            if (typeof window.openApp !== 'function') {
                throw new Error('El sistema de aplicaciones no está disponible');
            }

            await window.openApp(appId);
            terminal.writeSuccess(`Aplicación ${appId} abierta correctamente`);
        } catch (error) {
            terminal.writeError(error.message);
        }
    }

    async cmdEcho(args, terminal) {
        terminal.writeLine(args.join(' '));
    }

    async cmdPwd(args, terminal) {
        terminal.writeLine('/'); // Por ahora solo mostramos la raíz
    }

    async cmdCopy(args, terminal) {
        if (!args.length) {
            terminal.writeError('Uso: copy <texto>');
            return;
        }

        this.clipboard = args.join(' ');
        terminal.writeSuccess('Texto copiado al portapapeles');
    }

    async cmdPaste(args, terminal) {
        if (!this.clipboard) {
            terminal.writeError('No hay texto en el portapapeles');
            return;
        }

        terminal.writeLine(this.clipboard);
    }

    async cmdPowershell(args, terminal) {
        try {
            const command = args[0];
            const result = await window.pythonAPI.executePowerShell(command);
            
            if (result.success) {
                terminal.writeLine(result.stdout);
            } else {
                terminal.writeError(`Error: ${result.stderr}`);
            }
        } catch (error) {
            terminal.writeError(`Error: ${error.message}`);
        }
    }

    // Función para copiar texto desde cualquier parte del sistema
    copyText(text) {
        this.clipboard = text;
    }

    // Función para obtener el texto del portapapeles
    pasteText() {
        return this.clipboard;
    }
}

// Crear instancia global
window.systemAPI = new SystemAPI();

// Exportar la API para uso en Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemAPI;
} 