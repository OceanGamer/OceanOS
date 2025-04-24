async function isAppDockPinned(packageName) {
    try {
        const userData = await window.pythonAPI.readFile('Data/OS/user.json');
        const user = JSON.parse(userData);
        return (user.attachedApps || []).includes(packageName);
    } catch (error) {
        console.error('Error checking if app is dock pinned:', error);
        return false;
    }
}

function closedDockApp(pid) {
    // Buscar el botón por su ID
    const button = document.querySelector(`#dock_btn_${pid}`);
    if (button) {
        // Añadir clase de animación
        button.classList.add('closing');
        
        // Esperar a que termine la animación antes de eliminar
        setTimeout(() => {
            button.remove();
        }, 300);
    }
}

function openDockApp(pid, packageName, appLogo) {
    const logoPath = `Apps/${packageName}/appContainer/${appLogo}`;
    // Buscar el dock
    const dock = document.querySelector('.os_dock_obj');
    if (dock) {
        // Buscar el botón de la papelera
        const trashBtn = dock.querySelector('button[style*="basura.png"]');
        if (trashBtn) {
            // Crear el botón con la imagen y el evento click
            const button = document.createElement('button');
            button.id = `dock_btn_${pid}`; // Agregar ID único basado en el pid
            button.className = 'os_dock_appbtn os_dock_active opening'; // Añadir clase de animación
            button.style.backgroundImage = `url(${logoPath})`;
            button.onclick = () => dockBtnClick(pid);
            
            // Agregar evento de clic derecho para el menú contextual
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menu = ContextMenuManager.createNewContextMenu(button, e.clientX, e.clientY);
                ContextMenuManager.addNewContextBtn('Abrir nueva ventana', null, () => {
                    StartProcess(packageName);
                });
                
                ContextMenuManager.addNewContextBtn('Cerrar ventana', null, () => {
                    closeProcess(pid);
                });

                ContextMenuManager.addContextMenuSeparator()
                // Agregar opciones al menú
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
            
            // Agregar div interno
            const innerDiv = document.createElement('div');
            button.appendChild(innerDiv);
            
            // Insertar el botón antes del botón de la papelera
            trashBtn.before(button);
            
            // Remover clase de animación después de que termine
            setTimeout(() => {
                button.classList.remove('opening');
            }, 300);
        }
    }
}

async function loadDockApps() {
    try {
        // Leer el archivo user.json
        const userData = JSON.parse(await window.pythonAPI.readFile('Data/OS/user.json'));
        
        // Verificar si hay apps ancladas
        if (userData.attachedApps && userData.attachedApps.length > 0) {
            // Crear cada app anclada
            for (const packageName of userData.attachedApps) {
                await createPinnedApp(packageName);
            }
        }
    } catch (error) {
        console.error('Error al cargar las apps ancladas:', error);
    }
}

async function createPinnedApp(packageName) {
    try {
        // Leer la configuración de la app
        const appPath = `Apps/${packageName}`;
        const configPath = `${appPath}/appConfig.json`;
        const configData = JSON.parse(await window.pythonAPI.readFile(configPath));
        
        // Obtener el logo y nombre de la app
        const appLogo = configData.applogo;
        const appName = configData.appname;
        const logoPath = `Apps/${packageName}/appContainer/${appLogo}`;
        
        // Buscar el dock
        const dock = document.querySelector('.os_dock_obj');
        if (dock) {
            // Crear el botón con la imagen y el evento click
            const button = document.createElement('button');
            button.id = `pinned_btn_${packageName}`;
            button.className = 'os_dock_appbtn'; // Sin la clase os_dock_active
            button.style.backgroundImage = `url(${logoPath})`;
            button.title = appName; // Mostrar el nombre al pasar el mouse
            button.onclick = () => StartProcess(packageName);
            
            // Agregar evento de clic derecho para el menú contextual
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menu = ContextMenuManager.createNewContextMenu(button, e.clientX, e.clientY);
                
                // Agregar opciones al menú
                ContextMenuManager.addNewContextBtn('Abrir nueva ventana', null, () => {
                    StartProcess(packageName);
                });

                ContextMenuManager.addContextMenuSeparator()

                // Verificar si la aplicación está anclada
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
                
                ContextMenuManager.addNewContextBtn('Desanclar aplicación del Dock', null, () => {
                    unpinApp(packageName);
                });
            });
            
            // Agregar div interno
            const innerDiv = document.createElement('div');
            button.appendChild(innerDiv);
            
            // Insertar el botón a la izquierda del separador
            const separator = dock.querySelector('.verticalHr');
            if (separator) {
                separator.before(button);
            } else {
                // Si no hay separador, insertar al principio del dock
                dock.insertBefore(button, dock.firstChild);
            }
        }
    } catch (error) {
        console.error('Error al crear el botón anclado:', error);
    }
}

async function pinApp(packageName) {
    try {
        // Leer el archivo user.json
        const userData = JSON.parse(await window.pythonAPI.readFile('Data/OS/user.json'));
        
        // Verificar si la app ya está anclada
        if (!userData.attachedApps.includes(packageName)) {
            // Añadir la app a la lista
            userData.attachedApps.push(packageName);
            
            // Guardar los cambios
            await window.pythonAPI.writeFile('Data/OS/user.json', JSON.stringify(userData, null, 4));
            
            // Crear el botón anclado
            createPinnedApp(packageName);
        }
    } catch (error) {
        console.error('Error al anclar la aplicación:', error);
    }
}

async function unpinApp(packageName) {
    try {
        // Leer el archivo user.json
        const userData = JSON.parse(await window.pythonAPI.readFile('Data/OS/user.json'));
        
        // Verificar si la app está anclada
        const appIndex = userData.attachedApps.indexOf(packageName);
        if (appIndex !== -1) {
            // Eliminar la app de la lista
            userData.attachedApps.splice(appIndex, 1);
            
            // Guardar los cambios en user.json
            await window.pythonAPI.writeFile('Data/OS/user.json', JSON.stringify(userData, null, 4));
            
            // Eliminar el botón del dock
            const button = document.querySelector(`#pinned_btn_${packageName}`);
            if (button) {
                button.remove();
            }
        }
    } catch (error) {
        console.error('Error al desanclar la aplicación:', error);
    }
}

function dockBtnClick(pid) {
    // Buscar el proceso en el array Process
    const process = Process.find(p => p.pid === pid);
    
    if (process) {
        if (process.minimized) {
            // Si está minimizado, desminimizar y enfocar
            minimizeWindow(pid);
            focusWindow(pid);
        } else if (process.focused && !process.minimized) {
            // Si está enfocado y no minimizado, minimizar
            minimizeWindow(pid);
        } else {
            // Si no está minimizado ni enfocado, solo enfocar
            focusWindow(pid);
        }
    }
}