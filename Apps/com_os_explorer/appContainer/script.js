class FileExplorer {
    constructor() {
        this.currentPath = '';
        this.baseDir = 'D:/Documents/Documentos/Proyectos/OceanOS/Documents';
        this.rootDisplayName = 'OceanOS';
        this.history = [];
        this.currentHistoryIndex = -1;
        this.filesGrid = document.getElementById('filesGrid');
        this.currentPathElement = document.querySelector('.current-path');
        this.itemsCountElement = document.querySelector('.items-count');
        this.spaceAvailableElement = document.querySelector('.space-available');
        this.pendingResponses = [];
        
        this.setupEventListeners();
        this.loadInitialDirectory();
    }

    setupEventListeners() {
        // Eventos para los items del sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                const relativePath = item.getAttribute('data-path');
                const absolutePath = `${this.baseDir}/${relativePath}`;
                console.log(absolutePath)
                this.navigateTo(absolutePath);
            });
        });

        // Eventos para los botones de navegación
        document.querySelector('.nav-button.back').addEventListener('click', () => this.goBack());
        document.querySelector('.nav-button.forward').addEventListener('click', () => this.goForward());

        // Eventos para los botones de vista
        document.querySelector('.view-button.grid-view').addEventListener('click', () => this.setViewMode('grid'));
        document.querySelector('.view-button.list-view').addEventListener('click', () => this.setViewMode('list'));
    }

    async loadInitialDirectory() {
        await this.navigateTo(this.baseDir);
    }

    normalizePath(path) {
        // Convertir barras inclinadas hacia adelante a barras invertidas
        return path.replace(/\//g, '\\');
    }

    async navigateTo(path) {
        path = this.normalizePath(path);
        if (path === this.currentPath) return;

        try {
            await this.loadDirectoryContents(path);
            
            // Actualizar historial
            if (this.currentHistoryIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.currentHistoryIndex + 1);
            }
            this.history.push(path);
            this.currentHistoryIndex = this.history.length - 1;
            
            this.currentPath = path;
            
            // Mostrar ruta relativa limpia
            console.log(path)
            let displayPath = path.replace('D:\\Documents\\Documentos\\Proyectos\\OceanOS\\', '');
            this.currentPathElement.textContent = displayPath;
            
            this.updateNavigationButtons();
        } catch (error) {
            console.error('Error navegando al directorio:', error);
        }
    }

    goBack() {
        const normalizedPath = this.normalizePath(this.currentPath);
        
        // Lista de paths protegidos (no se puede retroceder desde ellos)
        const protectedPaths = [
            'Documents',
            'D:\\Documents\\Documentos\\Proyectos\\OceanOS\\'
        ].map(path => this.normalizePath(path));
        
        // Si estamos en un path protegido, no hacer nada
        if (protectedPaths.includes(normalizedPath)) return;
        
        const pathParts = normalizedPath.split('\\').filter(Boolean);
        
        // Si ya estamos en la raíz (solo queda la letra de unidad)
        if (pathParts.length <= 1) return;
        
        const parentPath = pathParts.slice(0, -1).join('\\') || 
                          (pathParts[0] ? pathParts[0] + '\\' : '');
        
        if (parentPath) this.navigateTo(parentPath);
    }

    goForward() {
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.currentHistoryIndex++;
            this.navigateTo(this.history[this.currentHistoryIndex]);
        }
    }

    updateNavigationButtons() {
        const backButton = document.querySelector('.nav-button.back');
        const forwardButton = document.querySelector('.nav-button.forward');
        
        backButton.disabled = this.currentHistoryIndex <= 0;
        forwardButton.disabled = this.currentHistoryIndex >= this.history.length - 1;
        
        backButton.style.opacity = backButton.disabled ? '0.5' : '1';
        forwardButton.style.opacity = forwardButton.disabled ? '0.5' : '1';
    }

    setViewMode(mode) {
        const gridButton = document.querySelector('.view-button.grid-view');
        const listButton = document.querySelector('.view-button.list-view');
        
        if (mode === 'grid') {
            this.filesGrid.classList.remove('list-view');
            gridButton.classList.add('active');
            listButton.classList.remove('active');
        } else {
            this.filesGrid.classList.add('list-view');
            listButton.classList.add('active');
            gridButton.classList.remove('active');
        }
    }

    async loadDirectoryContents(path) {
        try {
            const normalizedPath = this.normalizePath(path);
            const response = await this.sendSystemCommand(`ls ${normalizedPath}`);
            const files = this.parseDirectoryListing(response);
            this.displayFiles(files);
        } catch (error) {
            console.error('Error cargando directorio:', error);
        }
    }

    sendSystemCommand(command) {
        return new Promise((resolve, reject) => {
            const messageId = Math.random().toString(36).substring(2);

            const listener = (event) => {
                if (event.data.type === 'systemAPI-response' && event.data.messageId === messageId) {
                    window.removeEventListener('message', listener);
                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else {
                        resolve(event.data.response);
                    }
                }
            };

            window.addEventListener('message', listener);

            window.parent.postMessage({
                type: 'systemAPI-command',
                command: command,
                messageId: messageId
            }, '*');
        });
    }

    processResponse(response) {
        if (response.type === 'command-response' && response.output) {
            this.pendingResponses.push(response.output);
            
            // Buscar líneas que sean JSON válido
            const lines = response.output.split('\n');
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (Array.isArray(parsed) || typeof parsed === 'object') {
                        console.log('Archivos encontrados:', parsed);
                        this.displayFiles(Array.isArray(parsed) ? parsed : [parsed]);
                        this.pendingResponses = [];
                        return; // Salir después de procesar el JSON
                    }
                } catch (error) {
                    // Ignorar líneas que no son JSON
                }
            }
        }
    }

    displayFiles(files) {
        this.filesGrid.innerHTML = '';
        
        if (!Array.isArray(files)) {
            files = [files];
        }
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const icon = this.getFileIcon(file);
            const fileName = file.Name;
            
            fileItem.innerHTML = `
                <img src="${icon}" alt="${fileName}">
                <span>${fileName}</span>
            `;
            
            fileItem.addEventListener('click', () => {
                if (file.IsDirectory) {
                    const fullPath = this.normalizePath(file.FullName);
                    this.navigateTo(fullPath);
                }
            });
            
            this.filesGrid.appendChild(fileItem);
        });

        this.updateStatusBar(files);
    }

    getFileIcon(file) {
        if (file.IsDirectory) {
            return 'defaultIcons/Carpeta.png';
        }

        const fileName = file.Name || '';
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico', '.psd', '.ai'];
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv', '.wmv', '.mpeg', '.mpg', '.3gp'];
        const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.wma', '.m4a', '.mid', '.midi'];
        const documentExtensions = ['.doc', '.docx', '.pdf', '.rtf', '.odt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.ods', '.epub', '.txt', '.md', '.tex'];
        const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.dmg', '.pkg'];
        const executableExtensions = ['.exe', '.msi', '.bat', '.cmd', '.sh', '.deb', '.rpm', '.appimage', '.jar', '.com', '.ps1'];
        const scriptExtensions = ['.py', '.js', '.php', '.html', '.htm', '.css', '.json', '.xml', '.sql', '.rb', '.pl', '.lua', '.go', '.swift', '.kt'];
        const configExtensions = ['.ini', '.cfg', '.conf', '.env', '.reg', '.inf', '.yml', '.yaml', '.toml', '.properties'];
        const databaseExtensions = ['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb', '.frm', '.ibd', '.dbf', '.mdf'];
        const developerExtensions = ['.c', '.cpp', '.h', '.hpp', '.java', '.class', '.cs', '.vb', '.asm', '.s'];
        const webExtensions = ['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.scss', '.less', '.jsp', '.asp', '.aspx'];
        const systemExtensions = ['.dll', '.sys', '.drv', '.ocx', '.so', '.a', '.ko', '.lib', '.bin'];

        
        if (imageExtensions.includes(extension)) {
            return 'defaultIcons/image.png';
        } else if (videoExtensions.includes(extension)) {
            return 'defaultIcons/video.png';
        } else if (audioExtensions.includes(extension)) {
            return 'defaultIcons/audio.png';
        } else if (documentExtensions.includes(extension)) {
            return 'defaultIcons/document.png';
        } else if (archiveExtensions.includes(extension)) {
            return 'defaultIcons/archive.png';
        } else if (executableExtensions.includes(extension)) {
            return 'defaultIcons/executable.png';
        } else if (scriptExtensions.includes(extension) || developerExtensions.includes(extension)) {
            return 'defaultIcons/code.png';
        } else if (configExtensions.includes(extension) || systemExtensions.includes(extension)) {
            return 'defaultIcons/config.png';
        } else if (databaseExtensions.includes(extension)) {
            return 'defaultIcons/database.png';
        } else if (webExtensions.includes(extension)) {
            return 'defaultIcons/web.png';
        } else {
            return 'defaultIcons/unknown.png'; // Icono por defecto
        }
        
        return 'defaultIcons/Carpeta.png';
    }

    updateStatusBar(files) {
        const itemCount = files.length;
        this.itemsCountElement.textContent = `${itemCount} elemento${itemCount !== 1 ? 's' : ''}`;
        this.spaceAvailableElement.textContent = '';
    }

    parseDirectoryListing(output) {
        try {
            // Buscar la línea que contiene el JSON
            const lines = output.split('\n');
            let jsonLine = lines.find(line => {
                try {
                    const parsed = JSON.parse(line);
                    return Array.isArray(parsed) || typeof parsed === 'object';
                } catch {
                    return false;
                }
            });

            if (!jsonLine) {
                console.error('No se encontró JSON válido en la respuesta');
                return [];
            }

            let files = JSON.parse(jsonLine);
            if (!Array.isArray(files)) {
                files = [files];
            }
            return files;
        } catch (error) {
            console.error('Error parseando la salida JSON:', error);
            return [];
        }
    }
}

// Inicializar el explorador cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.explorer = new FileExplorer();

    // Escuchar mensajes del sistema
    window.addEventListener('message', (event) => {
        if (!event.data) return;
        
        const response = event.data;
        console.log('Mensaje recibido:', response);

        if (response.type === 'command-response') {
            window.explorer.processResponse(response);
        }
    });
});