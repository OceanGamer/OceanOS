class WindowsManager {
    constructor() {
        this.dragging = false;
        this.currentWindow = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.snapThreshold = 50; // Píxeles de margen para el snap
        this.originalWidth = null;
        this.originalHeight = null;
        this.originalLeft = null;
        this.originalTop = null;
        this.originalState = null; // Para guardar el estado de maximizado/fullscreen
        this.isSnapped = false; // Para saber si la ventana está en modo snap
        this.lastMouseX = 0; // Para mantener la posición del cursor
        this.lastMouseY = 0;
        this.mouseDownX = 0; // Para detectar si es un arrastre real
        this.mouseDownY = 0;
        this.dragThreshold = 5; // Píxeles de movimiento para considerar arrastre
        
        // Inicializar el manejador de eventos
        this.init();
    }
    
    init() {
        // Agregar evento mousedown a todas las barras de título
        document.addEventListener('mousedown', (e) => {
            // Verificar si se hizo clic en una ventana o su iframe
            const windowElement = e.target.closest('.os_window');
            if (windowElement) {
                // Obtener el PID de la ventana desde su ID
                const pid = parseInt(windowElement.id.split('_')[1]);
                if (!isNaN(pid)) {
                    focusWindow(pid);
                }
            }
            
            // Verificar si se hizo clic en una barra de título
            if (e.target.closest('#os_window_title')) {
                this.mouseDownX = e.clientX;
                this.mouseDownY = e.clientY;
                this.currentWindow = e.target.closest('.os_window');
            }
        });
        
        // Agregar eventos de mouse para el arrastre
        document.addEventListener('mousemove', (e) => {
            if (this.currentWindow && !this.dragging) {
                // Verificar si el mouse se ha movido lo suficiente para considerarlo arrastre
                const dx = Math.abs(e.clientX - this.mouseDownX);
                const dy = Math.abs(e.clientY - this.mouseDownY);
                
                if (dx > this.dragThreshold || dy > this.dragThreshold) {
                    this.startDragging(e);
                }
            }
            
            if (this.dragging) {
                this.drag(e);
                this.updateSnapPreviews(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.dragging) {
                this.stopDragging();
            }
            this.hideSnapPreviews();
            this.currentWindow = null;
            this.dragging = false;
        });
    }
    
    startDragging(e) {
        if (!this.currentWindow) return;
        
        // Obtener el PID de la ventana
        const pid = parseInt(this.currentWindow.id.split('_')[1]);
        const processIndex = Process.findIndex(p => p.pid === pid);
        const process = Process[processIndex];
        // Verificar si la ventana está en algún estado especial
        if (processIndex !== -1) {
            if (process.maximized || process.withoutdock || process.fulscreen) {
                return; // No permitir arrastrar si está en estado especial
            }
        }
        
        this.dragging = true;
        
        // Guardar la posición del mouse
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        // Verificar si la ventana está en modo snap
        const currentWidth = this.currentWindow.style.width;
        const currentLeft = this.currentWindow.style.left;
        this.isSnapped = currentWidth === '50%' && (currentLeft === '0px' || currentLeft === '0%' || currentLeft === '50%');
        
        // Si está en modo snap, restaurar el tamaño original inmediatamente
        if (this.isSnapped) {
            // Guardar el tamaño original antes de restaurar
            this.originalWidth = this.currentWindow.style.width;
            this.originalHeight = this.currentWindow.style.height;
            this.originalLeft = this.currentWindow.style.left;
            this.originalTop = this.currentWindow.style.top;
            
            // Restaurar tamaño y posición
            this.currentWindow.style.width = process.width + 'px';
            this.currentWindow.style.height =  process.height + 'px';
            this.currentWindow.style.borderRadius = '14px';
            
            // Calcular la nueva posición para mantener el cursor en el título
            const workarea = document.querySelector('.os_workarea');
            const workareaRect = workarea.getBoundingClientRect();
            const windowRect = this.currentWindow.getBoundingClientRect();
            
            // Calcular el offset del mouse respecto al título
            const titleBar = this.currentWindow.querySelector('#os_window_title');
            const titleRect = titleBar.getBoundingClientRect();
            const titleOffsetX = this.lastMouseX - titleRect.left;
            
            // Calcular la nueva posición
            let newX = this.lastMouseX - workareaRect.left - titleOffsetX;
            let newY = this.lastMouseY - workareaRect.top - 20; // 20px es la altura aproximada del título
            
            // Limitar la posición dentro del área de trabajo
            newX = Math.max(0, Math.min(newX, workareaRect.width - 600));
            newY = Math.max(0, Math.min(newY, workareaRect.height - 400));
            
            // Aplicar la nueva posición
            this.currentWindow.style.left = `${newX}px`;
            this.currentWindow.style.top = `${newY}px`;
            
            // Actualizar el offset para el arrastre
            const newRect = this.currentWindow.getBoundingClientRect();
            this.offsetX = this.lastMouseX - newRect.left;
            this.offsetY = this.lastMouseY - newRect.top;
        } else {
            // Guardar el tamaño y posición original
            this.originalWidth = this.currentWindow.style.width;
            this.originalHeight = this.currentWindow.style.height;
            this.originalLeft = this.currentWindow.style.left;
            this.originalTop = this.currentWindow.style.top;
            
            // Calcular el offset del mouse respecto a la ventana
            const rect = this.currentWindow.getBoundingClientRect();
            this.offsetX = this.lastMouseX - rect.left;
            this.offsetY = this.lastMouseY - rect.top;
        }
        
        // Guardar el estado actual de la ventana
        if (processIndex !== -1) {
            this.originalState = {
                maximized: Process[processIndex].maximized,
                withoutdock: Process[processIndex].withoutdock,
                fulscreen: Process[processIndex].fulscreen
            };
        }
        
        // Agregar clase para indicar que se está arrastrando
        this.currentWindow.classList.add('dragging');
    }
    
    drag(e) {
        if (!this.currentWindow) return;
        
        // Actualizar la posición del mouse
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        // Obtener el área de trabajo
        const workarea = document.querySelector('.os_workarea');
        const workareaRect = workarea.getBoundingClientRect();
        
        // Calcular nueva posición
        let newX = e.clientX - this.offsetX - workareaRect.left;
        let newY = e.clientY - this.offsetY - workareaRect.top;
        
        // Limitar la posición dentro del área de trabajo
        newX = Math.max(0, Math.min(newX, workareaRect.width - this.currentWindow.offsetWidth));
        newY = Math.max(0, Math.min(newY, workareaRect.height - this.currentWindow.offsetHeight));
        
        // Aplicar la nueva posición
        this.currentWindow.style.left = `${newX}px`;
        this.currentWindow.style.top = `${newY}px`;
    }
    
    stopDragging() {
        if (!this.currentWindow) return;
        
        const window = this.currentWindow;
        window.classList.remove('dragging');
        
        // Obtener el área de trabajo
        const workarea = document.querySelector('.os_workarea');
        const workareaRect = workarea.getBoundingClientRect();
        
        // Obtener la posición actual
        const rect = window.getBoundingClientRect();
        const x = rect.left - workareaRect.left;
        
        // Guardar el estado original antes de la animación
        const originalWidth = window.style.width;
        const originalHeight = window.style.height;
        const originalLeft = window.style.left;
        const originalTop = window.style.top;
        const originalBorderRadius = window.style.borderRadius;
        
        // Agregar clase de animación
        window.classList.add('snapping');
        
        // Aplicar el snap después de un pequeño retraso
        setTimeout(() => {
            // Verificar si está cerca de los bordes para aplicar snap
            if (x <= this.snapThreshold) {
                // Snap a la izquierda
                window.style.width = '50%';
                window.style.left = '0';
                window.style.top = '0';
                window.style.height = '100%';
                window.style.borderRadius = '0';
            }
            else if (x >= workareaRect.width - window.offsetWidth - this.snapThreshold) {
                // Snap a la derecha
                window.style.width = '50%';
                window.style.left = '50%';
                window.style.top = '0';
                window.style.height = '100%';
                window.style.borderRadius = '0';
            }
            else {
                // Restaurar el estado original si estaba en algún modo especial
                const pid = parseInt(window.id.split('_')[1]);
                if (this.originalState) {
                    if (this.originalState.maximized) {
                        maximizeWindow(pid);
                    } else if (this.originalState.withoutdock) {
                        maximizeWindowWithoutDock(pid);
                    } else if (this.originalState.fulscreen) {
                        fullScreenWindow(pid);
                    }
                }
            }
            
            // Remover clase de animación después de que termine
            setTimeout(() => {
                if (window) {
                    window.classList.remove('snapping');
                }
            }, 300);
        }, 10);
        
        // Limpiar variables
        this.dragging = false;
        this.currentWindow = null;
        this.originalState = null;
        this.isSnapped = false;
    }

    updateSnapPreviews(e) {
        if (!this.currentWindow) return;
        
        const workarea = document.querySelector('.os_workarea');
        const workareaRect = workarea.getBoundingClientRect();
        const leftPreview = document.querySelector('.snap-preview.left');
        const rightPreview = document.querySelector('.snap-preview.right');
        
        // Obtener la posición y tamaño de la ventana
        const windowRect = this.currentWindow.getBoundingClientRect();
        const windowLeft = windowRect.left - workareaRect.left;
        const windowRight = windowLeft + windowRect.width;
        
        // Mostrar previsualización izquierda cuando la ventana esté cerca del borde izquierdo
        if (windowLeft <= this.snapThreshold) {
            leftPreview.classList.add('visible');
            rightPreview.classList.remove('visible');
        }
        // Mostrar previsualización derecha cuando la ventana esté cerca del borde derecho
        else if (windowRight >= workareaRect.width - this.snapThreshold) {
            rightPreview.classList.add('visible');
            leftPreview.classList.remove('visible');
        }
        // Ocultar previsualizaciones cuando la ventana esté lejos de los bordes
        else {
            this.hideSnapPreviews();
        }
    }

    hideSnapPreviews() {
        const leftPreview = document.querySelector('.snap-preview.left');
        const rightPreview = document.querySelector('.snap-preview.right');
        
        if (leftPreview) {
            leftPreview.classList.remove('visible');
        }
        if (rightPreview) {
            rightPreview.classList.remove('visible');
        }
    }
}

// Inicializar el manejador de ventanas
window.windowsManager = new WindowsManager();
