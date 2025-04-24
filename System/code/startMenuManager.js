let startMenuOpen = false;

function openStartMenu() {
    const startMenu = document.querySelector('.os_application_start');
    if (!startMenuOpen) {
        startMenu.classList.add('visible');
        startMenu.style.transform = 'translateX(-50%) translateY(0)';
        startMenu.style.opacity = '1';
        loadStartMenuContent();
        
        // Asegurar que se muestre la pestaña de inicio
        const navButtons = document.querySelectorAll('.os_application_start_nav_btn');
        const tabs = document.querySelectorAll('.os_application_start_tab');
        
        navButtons.forEach(btn => {
            btn.classList.remove('os_application_start_nav_btn_active');
            if (btn.getAttribute('data-tab') === 'inicio') {
                btn.classList.add('os_application_start_nav_btn_active');
            }
        });
        
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === 'tab-inicio') {
                tab.classList.add('active');
            }
        });
        
        // Añadir event listener para cerrar el menú al hacer clic fuera
        document.addEventListener('click', closeStartMenuOnClickOutside);
    } else {
        closeStartMenu();
    }
    startMenuOpen = !startMenuOpen;
}

function closeStartMenu() {
    const startMenu = document.querySelector('.os_application_start');
    
    // Añadir clase de animación
    startMenu.classList.add('closing');
    
    // Aplicar transformación y opacidad
    startMenu.style.transform = 'translateX(-50%) translateY(20px) scale(0.95)';
    startMenu.style.opacity = '0';
    
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
        startMenu.classList.remove('visible');
        startMenu.classList.remove('closing');
        // Remover el event listener cuando se cierra el menú
        document.removeEventListener('click', closeStartMenuOnClickOutside);
    }, 300);
}

function closeStartMenuOnClickOutside(event) {
    const startMenu = document.querySelector('.os_application_start');
    // Verificar si el clic fue fuera del menú y no en el botón del menú
    if (!startMenu.contains(event.target) && !event.target.closest('.os_dock_appbtn')) {
        closeStartMenu();
        startMenuOpen = false;
    }
}

// Añadir event listener para clic derecho
document.addEventListener('contextmenu', (event) => {
    const startMenu = document.querySelector('.os_application_start');
    if (startMenuOpen && !startMenu.contains(event.target) && !event.target.closest('.os_dock_appbtn')) {
        closeStartMenu();
        startMenuOpen = false;
    }
});

function loadStartMenuContent() {
    loadPinnedApps();
    loadAllApps();
    setupTabNavigation();
    setupPowerButtons();
}

async function loadPinnedApps() {
    const pinnedAppsContainer = document.getElementById('startMenuPinnedApps');
    pinnedAppsContainer.innerHTML = '';

    try {
        // Leer las apps ancladas del menú de inicio
        const userData = await window.pythonAPI.readFile('Data/OS/user.json');
        const user = JSON.parse(userData);
        const pinnedApps = user.attachedStartMenuApps || [];

        // Cargar la configuración de cada app anclada
        for (const packageName of pinnedApps) {
            try {
                const configPath = `Apps/${packageName}/appConfig.json`;
                const configData = await window.pythonAPI.readFile(configPath);
                const config = JSON.parse(configData);
                createAppButton(packageName, pinnedAppsContainer, config.appname, config.applogo);
            } catch (error) {
                console.error(`Error loading config for pinned app ${packageName}:`, error);
            }
        }
    } catch (error) {
        console.error('Error loading pinned apps:', error);
    }
}

async function loadAllApps() {
    const allAppsContainer = document.getElementById('startMenuAllApps');
    allAppsContainer.innerHTML = '';

    try {
        // Usar PowerShell para listar los directorios
        const result = await window.pythonAPI.executePowerShell('Get-ChildItem -Path "Apps" -Directory | Select-Object -ExpandProperty Name');
        if (!result.success) {
            throw new Error('Error al listar directorios');
        }

        // Limpiar los nombres de los directorios (eliminar \r y espacios)
        const apps = result.stdout.split('\n')
            .map(app => app.trim())
            .filter(app => app !== '');

        const appConfigs = [];

        for (const app of apps) {
            try {
                const configPath = `Apps/${app}/appConfig.json`;
                const configData = await window.pythonAPI.readFile(configPath);
                const config = JSON.parse(configData);
                appConfigs.push({
                    packageName: app,
                    ...config
                });
            } catch (error) {
                console.error(`Error loading config for ${app}:`, error);
                // Aún así creamos un botón con la información básica
                appConfigs.push({
                    packageName: app,
                    appname: app,
                    applogo: 'app.png'
                });
            }
        }

        // Ordenar alfabéticamente
        appConfigs.sort((a, b) => a.appname.localeCompare(b.appname));

        // Crear botones
        appConfigs.forEach(app => {
            createAppButton(app.packageName, allAppsContainer, app.appname, app.applogo);
        });
    } catch (error) {
        console.error('Error loading apps:', error);
    }
}

function createAppButton(packageName, container, appName = null, appLogo = 'app.png') {
    const button = document.createElement('div');
    button.className = 'os_application_start_app';
    button.onclick = () => {
        StartProcess(packageName);
        openStartMenu(); // Cerrar el menú después de abrir la app
    };

    // Añadir evento de clic derecho para el menú contextual
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menu = ContextMenuManager.createNewContextMenu(button, e.clientX, e.clientY);
        
        // Opción 1: Abrir aplicación
        ContextMenuManager.addNewContextBtn('Abrir aplicación', null, () => {
            StartProcess(packageName);
            openStartMenu();
        });

        ContextMenuManager.addContextMenuSeparator();

        // Opción 2: Anclar/Desanclar en el dock
        isAppDockPinned(packageName).then(isDockPinned => {
            if (isDockPinned) {
                ContextMenuManager.addNewContextBtn('Desanclar aplicación del Dock', null, () => {
                    unpinApp(packageName);
                });
            } else {
                ContextMenuManager.addNewContextBtn('Anclar aplicación en el Dock', null, () => {
                    pinApp(packageName);
                });
            }
        });

        // Opción 3: Anclar/Desanclar en el menú inicio
        isAppPinned(packageName).then(isPinned => {
            if (isPinned) {
                ContextMenuManager.addNewContextBtn('Desanclar aplicación del Inicio', null, () => {
                    unpinAppStart(packageName);
                });
            } else {
                ContextMenuManager.addNewContextBtn('Anclar aplicación en el Inicio', null, () => {
                    pinAppStart(packageName);
                });
            }
        });
    });

    const img = document.createElement('img');
    img.src = `Apps/${packageName}/appContainer/${appLogo}`;
    button.appendChild(img);

    const name = document.createElement('p');
    name.textContent = appName || packageName;
    button.appendChild(name);

    container.appendChild(button);
}

function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.os_application_start_nav_btn');
    const tabs = document.querySelectorAll('.os_application_start_tab');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Actualizar botones de navegación
            navButtons.forEach(btn => btn.classList.remove('os_application_start_nav_btn_active'));
            button.classList.add('os_application_start_nav_btn_active');
            
            // Actualizar pestañas
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === `tab-${tabId}`) {
                    tab.classList.add('active');
                }
            });
        });
    });
}

function setupPowerButtons() {
    const powerButtons = document.querySelectorAll('.os_application_start_power_btn');
    
    powerButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            switch(action) {
                case 'shutdown':
                    StartProcess('com_os_shutdown');
                    break;
                case 'restart':
                    StartProcess('com_os_restart');
                    break;
                case 'suspend':
                    StartProcess('com_os_suspend');
                    break;
            }
            openStartMenu(); // Cerrar el menú después de la acción
        });
    });
}

async function pinAppStart(packageName) {
    try {
        // Leer el archivo de usuario actual
        const userData = await window.pythonAPI.readFile('Data/OS/user.json');
        const user = JSON.parse(userData);
        
        // Inicializar el array si no existe
        if (!user.attachedStartMenuApps) {
            user.attachedStartMenuApps = [];
        }
        
        // Verificar si la app ya está anclada
        if (!user.attachedStartMenuApps.includes(packageName)) {
            user.attachedStartMenuApps.push(packageName);
            
            // Guardar los cambios
            await window.pythonAPI.writeFile('Data/OS/user.json', JSON.stringify(user, null, 4));
            
            // Recargar las apps ancladas
            loadPinnedApps();
        }
    } catch (error) {
        console.error('Error al anclar la aplicación:', error);
    }
}

async function unpinAppStart(packageName) {
    try {
        // Leer el archivo de usuario actual
        const userData = await window.pythonAPI.readFile('Data/OS/user.json');
        const user = JSON.parse(userData);
        
        // Verificar si existe el array de apps ancladas
        if (user.attachedStartMenuApps) {
            // Filtrar la app a desanclar
            user.attachedStartMenuApps = user.attachedStartMenuApps.filter(app => app !== packageName);
            
            // Guardar los cambios
            await window.pythonAPI.writeFile('Data/OS/user.json', JSON.stringify(user, null, 4));
            
            // Recargar las apps ancladas
            loadPinnedApps();
        }
    } catch (error) {
        console.error('Error al desanclar la aplicación:', error);
    }
}

async function isAppPinned(packageName) {
    try {
        const userData = await window.pythonAPI.readFile('Data/OS/user.json');
        const user = JSON.parse(userData);
        return (user.attachedStartMenuApps || []).includes(packageName);
    } catch (error) {
        console.error('Error checking if app is pinned:', error);
        return false;
    }
}