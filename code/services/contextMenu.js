// ContextMenuManager.js
let currentContextMenu = null;
let isMenuOpen = false;
let clickOutsideHandler = null;

/**
 * Crea un nuevo menú contextual
 * @param {HTMLElement} divReference - Elemento de referencia para posicionamiento
 * @param {number} x - Coordenada X opcional
 * @param {number} y - Coordenada Y opcional
 * @returns {HTMLElement} El menú contextual creado
 */
function createNewContextMenu(divReference = null, x = null, y = null) {
    // Si ya hay un menú abierto, lo cerramos primero
    if (isMenuOpen) {
        closeCurrentContextMenu();
        return null;
    }
    
    // Crear el elemento del menú
    const contextMenu = document.createElement('div');
    contextMenu.className = 'os_context_menu';
    contextMenu.id = 'dynamic_context_menu_' + Date.now();
    
    // Añadir al documento temporalmente para calcular dimensiones
    document.body.appendChild(contextMenu);
    
    // Obtener dimensiones del menú
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    
    // Obtener dimensiones de la ventana
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Posicionamiento
    if (divReference) {
        const rect = divReference.getBoundingClientRect();
        
        // Calcular las dimensiones disponibles
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = windowWidth - rect.left;
        const spaceLeft = rect.right;

        // Decidir posición vertical
        let menuY;
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            // Mostrar debajo si hay espacio suficiente o hay más espacio que arriba
            menuY = rect.bottom + window.scrollY;
            if (menuY + menuHeight > windowHeight) {
                menuY = windowHeight - menuHeight;
            }
        } else {
            // Mostrar arriba si hay más espacio arriba
            menuY = rect.top + window.scrollY - menuHeight;
            if (menuY < 0) {
                menuY = 0;
            }
        }

        // Decidir posición horizontal
        let menuX;
        if (spaceRight >= menuWidth) {
            // Mostrar a la derecha si hay espacio
            menuX = rect.left + window.scrollX;
        } else if (spaceLeft >= menuWidth) {
            // Mostrar a la izquierda si hay espacio
            menuX = rect.right + window.scrollX - menuWidth;
        } else {
            // Si no hay espacio ni a la derecha ni a la izquierda, centrar o alinear al borde
            menuX = Math.max(0, windowWidth - menuWidth);
        }
        
        contextMenu.style.top = `${menuY}px`;
        contextMenu.style.left = `${menuX}px`;
    } else if (x !== null && y !== null) {
        // Calcular las dimensiones disponibles desde el punto de clic
        const spaceBelow = windowHeight - y;
        const spaceAbove = y;
        const spaceRight = windowWidth - x;
        
        // Decidir posición vertical
        let menuY;
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            menuY = y;
            if (menuY + menuHeight > windowHeight) {
                menuY = windowHeight - menuHeight;
            }
        } else {
            menuY = y - menuHeight;
            if (menuY < 0) {
                menuY = 0;
            }
        }

        // Decidir posición horizontal
        let menuX;
        if (spaceRight >= menuWidth) {
            menuX = x;
        } else {
            menuX = Math.max(0, windowWidth - menuWidth);
        }
        
        contextMenu.style.top = `${menuY}px`;
        contextMenu.style.left = `${menuX}px`;
    } else {
        // Centrar si no hay coordenadas
        contextMenu.style.top = '50%';
        contextMenu.style.left = '50%';
        contextMenu.style.transform = 'translate(-50%, -50%)';
    }
    
    // Configurar el handler para clics fuera del menú
    clickOutsideHandler = (e) => handleClickOutside(e, contextMenu);
    document.addEventListener('click', clickOutsideHandler, true);
    
    // Mostrar con animación
    setTimeout(() => {
        contextMenu.classList.add('visible');
    }, 10);
    
    currentContextMenu = contextMenu;
    isMenuOpen = true;
    
    return contextMenu;
}

/**
 * Maneja clics fuera del menú
 * @param {Event} event 
 * @param {HTMLElement} menu 
 */
function handleClickOutside(event, menu) {
    if (menu && !menu.contains(event.target)) {
        closeCurrentContextMenu();
    }
}

/**
 * Cierra el menú contextual actual
 */
function closeCurrentContextMenu() {
    if (!isMenuOpen || !currentContextMenu) return;
    
    // Remover el event listener primero para evitar conflictos
    if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler, true);
        clickOutsideHandler = null;
    }
    
    // Animación de cierre
    if (currentContextMenu.classList.contains('visible')) {
        currentContextMenu.classList.remove('visible');
        
        // Esperar a que termine la animación antes de remover
        setTimeout(() => {
            if (currentContextMenu && document.body.contains(currentContextMenu)) {
                document.body.removeChild(currentContextMenu);
            }
            currentContextMenu = null;
            isMenuOpen = false;
        }, 150);
    } else {
        // Si no tiene animación, remover inmediatamente
        if (currentContextMenu && document.body.contains(currentContextMenu)) {
            document.body.removeChild(currentContextMenu);
        }
        currentContextMenu = null;
        isMenuOpen = false;
    }
}

/**
 * Verifica y ajusta la posición del menú para mantenerlo dentro de la pantalla
 * @param {HTMLElement} menu - El menú contextual a ajustar
 */
function adjustMenuPosition(menu) {
    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Ajustar posición horizontal si se sale de la pantalla
    if (rect.right > windowWidth) {
        const newLeft = Math.max(0, windowWidth - rect.width);
        menu.style.left = `${newLeft}px`;
    }

    // Ajustar posición vertical si se sale de la pantalla
    if (rect.bottom > windowHeight) {
        // Si hay espacio arriba, mover el menú arriba del punto de referencia
        const newTop = Math.max(0, windowHeight - rect.height);
        menu.style.top = `${newTop}px`;
    }
}

/**
 * Añade un nuevo botón al menú contextual actual
 * @param {string} text - Texto del botón
 * @param {string} shortcut - Atajo de teclado (opcional)
 * @param {function} action - Función a ejecutar al hacer clic
 * @param {string} icon - URL del icono (opcional)
 */
function addNewContextBtn(text, shortcut = null, action = null, icon = null) {
    if (!currentContextMenu || !isMenuOpen) {
        return;
    }
    
    const button = document.createElement('button');
    button.className = 'os_context_menu_item';
    button.innerHTML = text;
    
    if (shortcut) {
        const shortcutEl = document.createElement('div');
        shortcutEl.className = 'shortcut';
        shortcutEl.textContent = shortcut;
        button.appendChild(shortcutEl);
    }
    
    if (icon) {
        const iconEl = document.createElement('div');
        iconEl.className = 'icon';
        iconEl.style.backgroundImage = `url('${icon}')`;
        button.insertBefore(iconEl, button.firstChild);
    }
    
    if (action) {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            closeCurrentContextMenu();
            action();
        });
    }
    
    currentContextMenu.appendChild(button);

    // Esperar al siguiente frame para que el DOM se actualice
    requestAnimationFrame(() => {
        // Verificar y ajustar la posición después de añadir el botón
        adjustMenuPosition(currentContextMenu);
    });
}

/**
 * Añade un separador al menú contextual actual
 */
function addContextMenuSeparator() {
    if (!currentContextMenu || !isMenuOpen) {
        console.error('No hay ningún menú contextual activo');
        return;
    }
    
    const separator = document.createElement('hr');
    currentContextMenu.appendChild(separator);
}

// Exportar funciones para uso global
window.ContextMenuManager = {
    createNewContextMenu,
    addNewContextBtn,
    addContextMenuSeparator,
    closeCurrentContextMenu
};