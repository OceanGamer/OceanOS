class Terminal {
    constructor() {
        this.output = document.getElementById('output');
        this.input = document.getElementById('input');
        this.history = [];
        this.historyIndex = -1;
        this.currentInput = '';
        this.isExecuting = false;

        this.setupEventListeners();
        this.writeWelcome();

        // Notificar que la terminal está lista
        window.parent.postMessage({
            type: 'terminal-ready'
        }, '*');

        // Intentar acceder a la API del sistema
        this.connectToSystemAPI();
    }

    connectToSystemAPI() {
        // Intentar cada 100ms hasta que la API esté disponible
        const checkAPI = setInterval(() => {
            try {
                if (window.parent && window.parent.systemAPI) {
                    console.log('API del sistema encontrada');
                    this.systemAPI = window.parent.systemAPI;
                    clearInterval(checkAPI);
                }
            } catch (error) {
                console.log('Esperando API del sistema...');
            }
        }, 100);

        // Timeout después de 5 segundos
        setTimeout(() => {
            clearInterval(checkAPI);
            if (!this.systemAPI) {
                console.error('No se pudo conectar con la API del sistema');
            }
        }, 5000);
    }

    setupEventListeners() {
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.input.addEventListener('input', () => this.handleInput());
        this.input.focus();

        // Mantener el foco en el input
        document.addEventListener('click', () => this.input.focus());

        // Escuchar respuestas del sistema
        window.addEventListener('message', (event) => {
            if (!event.data) return;
            
            console.log('Mensaje recibido:', event.data);
            const response = event.data;
            
            if (response.type === 'command-response') {
                if (response.clear) {
                    this.clear();
                } else if (response.error) {
                    this.writeError(response.error);
                } else if (response.success) {
                    this.writeSuccess(response.success);
                } else if (response.output) {
                    this.writeLine(response.output);
                }
                this.isExecuting = false;
                this.input.focus();
            } else if (response.type === 'app-terminate') {
                // Limpiar recursos antes de cerrar
                this.cleanup();
                
                // Notificar al sistema que la terminal se cerrará
                window.parent.postMessage({
                    type: 'app-closing',
                    appId: 'terminal'
                }, '*');
                
                // Cerrar la ventana de la terminal
                if (window.parent.closeApp) {
                    window.parent.closeApp('terminal');
                }
                
                // Si se especifica closeWindow, forzar el cierre
                if (response.closeWindow) {
                    setTimeout(() => {
                        if (window.parent.closeApp) {
                            window.parent.closeApp('terminal');
                        }
                    }, 100);
                }
            }
        });

        // Limpiar recursos cuando se cierre la ventana
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    writeWelcome() {
        this.writeLine('OceanOS Terminal [Versión 1.0.0]');
        this.writeLine('(c) 2025 OceanOS. Todos los derechos reservados.');
        this.writeLine('');
        this.writeLine('Escribe "help" para ver la lista de comandos disponibles.');
        this.writeLine('');
    }

    writeLine(text, className = '') {
        const line = document.createElement('div');
        line.className = 'output-line ' + className;
        line.textContent = text;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    writeError(text) {
        this.writeLine(text, 'error-line');
    }

    writeSuccess(text) {
        this.writeLine(text, 'success-line');
    }

    writeInfo(text) {
        this.writeLine(text, 'info-line');
    }

    writeWarning(text) {
        this.writeLine(text, 'warning-line');
    }

    clear() {
        this.output.innerHTML = '';
    }

    scrollToBottom() {
        this.output.scrollTop = this.output.scrollHeight;
    }

    async executeCommand(command) {
        if (!command || this.isExecuting) return;

        this.isExecuting = true;
        this.writeLine(`$ ${command}`);

        // Añadir al historial
        this.history.push(command);
        this.historyIndex = this.history.length;

        try {
            if (this.systemAPI) {
                console.log('Ejecutando comando directamente:', command);
                await this.systemAPI.executeCommand(command, {
                    writeLine: (text) => this.writeLine(text),
                    writeError: (text) => this.writeError(text),
                    writeSuccess: (text) => this.writeSuccess(text),
                    clear: () => this.clear()
                });
            } else {
                console.log('Enviando comando por mensaje:', command);
                window.parent.postMessage({
                    type: 'terminal-command',
                    command: command,
                    source: 'terminal'
                }, '*');
            }
        } catch (error) {
            console.error('Error ejecutando comando:', error);
            this.writeError(`Error: ${error.message}`);
        } finally {
            this.isExecuting = false;
            this.input.focus();
        }

        this.scrollToBottom();
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                const command = this.input.value.trim();
                this.input.value = '';
                if (command) {
                    this.executeCommand(command);
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (this.historyIndex > 0) {
                    if (this.historyIndex === this.history.length) {
                        this.currentInput = this.input.value;
                    }
                    this.historyIndex--;
                    this.input.value = this.history[this.historyIndex];
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (this.historyIndex < this.history.length) {
                    this.historyIndex++;
                    this.input.value = this.historyIndex === this.history.length
                        ? this.currentInput
                        : this.history[this.historyIndex];
                }
                break;

            case 'Tab':
                e.preventDefault();
                // Aquí se podría implementar el autocompletado
                break;

            case 'c':
                if (e.ctrlKey) {
                    this.input.value = '';
                    this.writeLine('^C');
                }
                break;

            case 'l':
                if (e.ctrlKey) {
                    this.clear();
                    e.preventDefault();
                }
                break;
        }
    }

    handleInput() {
        // Aquí se pueden agregar funciones adicionales al escribir
    }

    cleanup() {
        // Limpiar cualquier recurso pendiente
        this.isExecuting = false;
        this.history = [];
        this.currentInput = '';
        
        // Notificar al sistema que la terminal se está cerrando
        window.parent.postMessage({
            type: 'app-closing',
            appId: 'terminal'
        }, '*');
        
        // Forzar el cierre si es necesario
        if (window.parent.closeApp) {
            window.parent.closeApp('terminal');
        }
    }
}

// Inicializar la terminal cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.terminal = new Terminal();
}); 