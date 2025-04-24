let Process = []
let countid = 1000	

async function StartProcess(packageName) {
    let appPath = `Apps/${packageName}`
    try {
        // Verificar si existe la carpeta de la aplicación usando el backend
        const exists = await window.pythonAPI.checkFileExists(appPath);
        
        if (exists) {
            // Leer y parsear el archivo de configuración usando el backend
            let configPath = `${appPath}/appConfig.json`
            let configData = JSON.parse(await window.pythonAPI.readFile(configPath))
            
            // Extraer datos de configuración
            let appName = configData.appname
            let appLogo = configData.applogo  
            let width = configData.width
            let height = configData.height
            let minWidth = configData.minWidth
            let minHeight = configData.minHeight
            let resizable = configData.resizable
            let html = configData.index
            let navMenus = configData.navMenus || [] // Añadir los menús del navbar
            
            // Crear objeto con los datos de la aplicación
            let processData = {
                pid: countid++, // ID único que se incrementa
                packageName: packageName,
                appName: appName,
                appLogo: appLogo,
                width: width,
                height: height,
                minWidth: minWidth,
                minHeight: minHeight,
                resizable: resizable,
                maximized: false,
                minimized: false,
                withoutdock: false,
                fulscreen: false,
                focused: false,
                snapped: false,
                created: new Date().toISOString(),
                lastPosition: {
                    left: 0,
                    top: 0
                },
                lastHeight: height,
                lastWidth: width,
                navMenus: navMenus // Añadir los menús al proceso
            }
            
            // Agregar el proceso al array Process
            Process.push(processData)
            
            // Mostrar información del array y el proceso
            console.log('Array Process completo:', Process)
            console.log('Proceso actual:', Process[Process.length - 1])
            
            // Obtener el div os_workarea
            let workarea = document.querySelector('.os_workarea')
            
            // Cargar el template de la ventana
            let windowHTML = await window.pythonAPI.readFile('System/html/os_window.html')
            
            // Crear elemento temporal para manipular el HTML
            let temp = document.createElement('div')
            temp.innerHTML = windowHTML
            
            // Configurar la ventana
            let windowElement = temp.firstElementChild
            windowElement.id = `window_${processData.pid}` // ID único basado en el pid
            windowElement.style.width = width + 'px'
            windowElement.style.height = height + 'px'
            
            // Centrar la ventana inicialmente
            const workareaWidth = workarea.clientWidth;
            const workareaHeight = workarea.clientHeight;
            
            const left = (workareaWidth - width) / 2;
            const top = (workareaHeight - height) / 2;
            
            windowElement.style.left = left + 'px';
            windowElement.style.top = top + 'px';
            
            // Guardar posición inicial
            processData.lastPosition.left = left;
            processData.lastPosition.top = top;
            
            // Agregar funcionalidad de redimensionamiento si está habilitada
            if (resizable) {
                windowElement.style.resize = 'both'
                windowElement.style.overflow = 'auto'
                windowElement.style.minWidth = minWidth + 'px';
                windowElement.style.minHeight = minHeight + 'px';
            }
            
            // Configurar el título
            windowElement.querySelector('#os_window_title').textContent = appName
            
            // Crear y configurar el iframe
            let iframe = document.createElement('iframe')
            iframe.src = `${appPath}/appContainer/${html}`
            iframe.style.width = '100%'
            iframe.style.height = '100%'
            iframe.style.border = 'none'
            
            // Asegurar que la ventana principal tenga el foco
            window.focus()
            
            // Variable para rastrear si el mouse está sobre el iframe
            let isMouseOver = false
            
            // Agregar eventos para detectar interacciones con el iframe
            iframe.addEventListener('mouseenter', () => {
                isMouseOver = true
            })
            
            iframe.addEventListener('mouseleave', () => {
                isMouseOver = false
            })
            
            iframe.addEventListener('mousedown', () => {
                if (isMouseOver) {
                    focusWindow(processData.pid)
                }
            })
            
            iframe.addEventListener('focus', () => {
                focusWindow(processData.pid)
            })
            
            // Agregar evento blur para detectar cuando el foco sale de la ventana
            window.addEventListener('blur', () => {
                setTimeout(() => {
                    if (document.activeElement === iframe) {
                        focusWindow(processData.pid)
                    }
                })
            }, { capture: true })
            
            // Insertar el iframe en el contenido de la ventana
            let windowContent = windowElement.querySelector('#os_window_content')
            windowContent.appendChild(iframe)
            
            // Agregar manejadores de eventos a los botones de control
            let minimizeBtn = windowElement.querySelector('.os_window_control_minimize')
            let maximizeBtn = windowElement.querySelector('.os_window_control_maximize')
            let closeBtn = windowElement.querySelector('.os_window_control_close')
            
            minimizeBtn.onclick = () => minimizeWindow(processData.pid)
            maximizeBtn.onclick = () => {
                // Si la ventana está en algún modo especial, volver a normal
                if (processData.maximized || processData.withoutdock || processData.fulscreen) {
                    processData.maximized = true;
                    maximizeWindow(processData.pid);
                    processData.withoutdock = false;
                    processData.fulscreen = false;
                    processData.maximized = false;
                } else {
                    // Guardar posición actual antes de maximizar
                    processData.lastPosition.left = parseInt(windowElement.style.left);
                    processData.lastPosition.top = parseInt(windowElement.style.top);
                    
                    maximizeWindow(processData.pid);
                }
            }
            closeBtn.onclick = () => closeProcess(processData.pid)
            
            // Agregar menú contextual al botón de maximizar
            maximizeBtn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menu = ContextMenuManager.createNewContextMenu(maximizeBtn, e.clientX, e.clientY);
                
                ContextMenuManager.addNewContextBtn('Ventana Completa', null, () => {
                    fullScreenWindow(processData.pid);
                });

                ContextMenuManager.addNewContextBtn('Ventana Maximizada sin dock', null, () => {
                    maximizeWindowWithoutDock(processData.pid);
                });

                ContextMenuManager.addNewContextBtn('Ventana Maximizada', null, () => {
                    maximizeWindow(processData.pid);
                });
            });
            
            // Insertar la ventana en el área de trabajo
            workarea.appendChild(windowElement)

            setTimeout(() => {
                windowElement.classList.remove('opening');
            }, 300);
            
            // Abrir la app en el dock
            focusWindow(processData.pid)
            openDockApp(processData.pid, packageName, appLogo);
            
        } else {
            console.log("Esta app no está instalada")
        }
    } catch(err) {
        console.log(`Error al iniciar la aplicación ${appPath}: ${err}`)
    }
}

function closeProcess(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid)
    
    if (processIndex !== -1) {
        let process = Process[processIndex]
        let window = document.querySelector(`#window_${pid}`)
        
        if (window) {
            // Añadir clase de animación
            window.classList.add('closing');
            
            // Limpiar el navbar
            resetbtnleftside();
            
            // Esperar a que termine la animación antes de eliminar
            setTimeout(() => {
                window.remove();
                // Cerrar la app en el dock
                closedDockApp(pid);
                
                // Eliminar el proceso del array
                Process.splice(processIndex, 1)
                console.log(`Proceso ${process.appName} (PID: ${pid}) cerrado`)
                console.log('Array Process actualizado:', Process)
            }, 300); // Duración de la animación
            toggleDockAndNavbar(true, true, true);
        }
    } else {
        console.log(`No se encontró el proceso con PID: ${pid}`)
    }
}

function toggleDockAndNavbar(show, hideDock = true, hideNavbar = true) {
    const dock = document.querySelector('.os_dock');
    const navbar = document.querySelector('.os_navbar');
    const workarea = document.querySelector('.os_workarea');

    if (show) {
        if (hideDock) {
            dock.style.display = 'flex';
            setTimeout(() => dock.classList.add('showing'), 10);
            workarea.style.bottom = '80px';
        }
        if (hideNavbar) {
            navbar.style.display = 'flex';
            setTimeout(() => navbar.classList.add('showing'), 10);
            workarea.style.top = '28px';
        }
    } else {
        if (hideDock) {
            dock.classList.remove('showing');
            dock.classList.add('hiding');
            workarea.style.bottom = '0';
            setTimeout(() => {
                dock.style.display = 'none';
                dock.classList.remove('hiding');
            }, 300);
        }
        if (hideNavbar) {
            navbar.classList.remove('showing');
            navbar.classList.add('hiding');
            workarea.style.top = '0';
            setTimeout(() => {
                navbar.style.display = 'none';
                navbar.classList.remove('hiding');
            }, 300);
        }
    }
}

function maximizeWindow(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid);
    if (processIndex !== -1) {
        let window = document.querySelector(`#window_${pid}`);
        let process = Process[processIndex];
        
        if (window) {
            if (!process.maximized) {
                // Guardar posición y tamaño original
                window.style.setProperty('--original-width', window.style.width);
                window.style.setProperty('--original-height', window.style.height);
                window.style.setProperty('--original-left', window.style.left);
                window.style.setProperty('--original-top', window.style.top);
                process.lastPosition.left = parseInt(window.style.left);
                process.lastPosition.top = parseInt(window.style.top);
                
                // Añadir clase de animación
                window.classList.add('maximizing');
                toggleDockAndNavbar(true, true, true);
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = '100%';
                    window.style.height = '100%';
                    window.style.resize = 'none';
                    window.style.top = '0';
                    window.style.left = '0';
                    window.style.borderRadius = '0px';
                    
                    process.maximized = true;
                    process.withoutdock = false;
                    process.fulscreen = false;
                    
                    // Remover clase de animación
                    window.classList.remove('maximizing');
                }, 400);
            } else {
                // Guardar posición y tamaño actual antes de desmaximizar
                window.style.setProperty('--original-width', process.width + 'px');
                window.style.setProperty('--original-height', process.height + 'px');
                window.style.setProperty('--original-left', process.lastPosition.left + 'px');
                window.style.setProperty('--original-top', process.lastPosition.top + 'px');
                
                // Añadir clase de animación
                window.classList.add('unmaximizing');
                toggleDockAndNavbar(true, true, true);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = process.width + 'px';
                    window.style.height = process.height + 'px';
                    if (process.resizable) {
                        window.style.resize = 'both';
                    }
                    
                    // Restaurar última posición guardada
                    window.style.left = process.lastPosition.left + 'px';
                    window.style.top = process.lastPosition.top + 'px';
                    window.style.borderRadius = '14px';
                    
                    process.maximized = false;
                    process.withoutdock = false;
                    process.fulscreen = false;
                    
                    // Remover clase de animación
                    window.classList.remove('unmaximizing');
                }, 400);
            }
            
            // Enfocar la ventana
            focusWindow(pid);
        }
    }
}

function maximizeWindowWithoutDock(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid);
    
    if (processIndex !== -1) {
        let window = document.querySelector(`#window_${pid}`);
        let process = Process[processIndex];
        
        if (window) {
            if (!process.withoutdock) {
                // Guardar posición y tamaño original
                window.style.setProperty('--original-width', window.style.width);
                window.style.setProperty('--original-height', window.style.height);
                window.style.setProperty('--original-left', window.style.left);
                window.style.setProperty('--original-top', window.style.top);
                process.lastPosition.left = parseInt(window.style.left);
                process.lastPosition.top = parseInt(window.style.top);
                
                // Añadir clase de animación
                window.classList.add('withoutdocking');
                
                // Ocultar dock con animación
                toggleDockAndNavbar(false, true, false);
                toggleDockAndNavbar(true, false, true);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = '100%';
                    window.style.height = '100%';
                    window.style.resize = 'none';
                    window.style.top = '0';
                    window.style.left = '0';
                    window.style.borderRadius = '0px';
                    
                    process.withoutdock = true;
                    process.maximized = false;
                    process.fulscreen = false;
                    
                    // Remover clase de animación
                    window.classList.remove('withoutdocking');
                }, 400);
            } else {
                // Añadir clase de animación
                window.classList.add('withoutdockrestoring');
                
                // Mostrar dock con animación
                toggleDockAndNavbar(true, true, true);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = process.width + 'px';
                    window.style.height = process.height + 'px';
                    if (process.resizable) {
                        window.style.resize = 'both';
                    }
                    
                    // Restaurar última posición guardada
                    window.style.left = process.lastPosition.left + 'px';
                    window.style.top = process.lastPosition.top + 'px';
                    window.style.borderRadius = '14px';
                    
                    process.withoutdock = false;
                    process.maximized = false;
                    process.fulscreen = false;
                    
                    // Remover clase de animación
                    window.classList.remove('withoutdockrestoring');
                }, 400);
            }
            
            // Enfocar la ventana
            focusWindow(pid);
        }
    }
}

function fullScreenWindow(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid);
    
    if (processIndex !== -1) {
        let window = document.querySelector(`#window_${pid}`);
        let process = Process[processIndex];
        
        if (window) {
            if (!process.fulscreen) {
                // Guardar posición y tamaño original
                window.style.setProperty('--original-width', window.style.width);
                window.style.setProperty('--original-height', window.style.height);
                window.style.setProperty('--original-left', window.style.left);
                window.style.setProperty('--original-top', window.style.top);
                process.lastPosition.left = parseInt(window.style.left);
                process.lastPosition.top = parseInt(window.style.top);
                
                // Añadir clase de animación
                window.classList.add('fullscreening');
                
                // Ocultar dock y navbar con animación
                toggleDockAndNavbar(false, true, true);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = '100%';
                    window.style.height = '100%';
                    window.style.resize = 'none';
                    window.style.top = '0';
                    window.style.left = '0';
                    window.style.borderRadius = '0px';
                    
                    process.fulscreen = true;
                    process.maximized = false;
                    process.withoutdock = false;
                    
                    // Remover clase de animación
                    window.classList.remove('fullscreening');
                }, 400);
            } else {
                // Añadir clase de animación
                window.classList.add('fullscreenrestoring');
                
                // Mostrar dock y navbar con animación
                toggleDockAndNavbar(true, true, true);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.width = process.width + 'px';
                    window.style.height = process.height + 'px';
                    if (process.resizable) {
                        window.style.resize = 'both';
                    }
                    
                    // Restaurar última posición guardada
                    window.style.left = process.lastPosition.left + 'px';
                    window.style.top = process.lastPosition.top + 'px';
                    window.style.borderRadius = '14px';
                    
                    process.fulscreen = false;
                    process.maximized = false;
                    process.withoutdock = false;
                    
                    // Remover clase de animación
                    window.classList.remove('fullscreenrestoring');
                }, 400);
            }
            
            // Enfocar la ventana
            focusWindow(pid);
        }
    }
}

function minimizeWindow(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid);
    
    if (processIndex !== -1) {
        let window = document.querySelector(`#window_${pid}`);
        let process = Process[processIndex];
        
        if (window) {
            if (!process.minimized) {
                // Calcular posición del botón del dock
                const dockBtn = document.querySelector(`#dock_btn_${pid}`);
                if (dockBtn) {
                    const rect = dockBtn.getBoundingClientRect();
                    window.style.setProperty('--minimize-target-x', `${rect.left}px`);
                    window.style.setProperty('--minimize-target-y', `${rect.top}px`);
                }

                // Añadir clase de animación
                window.classList.add('closing');
                process.lastPosition.left = parseInt(window.style.left);
                process.lastPosition.top = parseInt(window.style.top);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    window.style.display = 'none';
                    process.minimized = true;
                    
                    // Quitar el foco cuando se minimiza
                    process.focused = false;
                    
                    // Actualizar la clase del botón del dock
                    if (dockBtn) {
                        dockBtn.classList.remove('os_dock_active');
                        dockBtn.classList.add('os_dock_open');
                    }
                    
                    // Limpiar el navbar
                    resetbtnleftside();
                    
                    // Mostrar dock y navbar
                    toggleDockAndNavbar(true, true, true);
                    
                    // Remover clase de animación
                    window.classList.remove('closing');
                }, 300);
            } else {
                window.classList.add('opening');
                window.style.display = 'flex';
                // Restaurar la última posición
                window.style.left = process.lastPosition.left + 'px';
                window.style.top = process.lastPosition.top + 'px';
                process.minimized = false;

                // Restaurar el estado de dock y navbar según el modo de la ventana
                if (process.maximized) {
                    toggleDockAndNavbar(true, true, true);
                } else if (process.withoutdock) {
                    toggleDockAndNavbar(false, true, false);
                    toggleDockAndNavbar(true, false, true);
                } else if (process.fulscreen) {
                    toggleDockAndNavbar(false, true, true);
                } else {
                    toggleDockAndNavbar(true, true, true);
                }

                setTimeout(() => {
                    window.classList.remove('opening');
                }, 300);
            }
        }
    }
}

function focusWindow(pid) {
    let processIndex = Process.findIndex(p => p.pid === pid);
    
    if (processIndex !== -1) {
        let window = document.querySelector(`#window_${pid}`);
        let process = Process[processIndex];
        
        if (window) {
            // Obtener todas las ventanas y resetear su z-index y opacidad
            let allWindows = document.querySelectorAll('.os_window');
            allWindows.forEach(win => {
                win.style.zIndex = '1';
                win.classList.remove('active');
                win.classList.add('inactive');
            });
            
            // Poner la ventana seleccionada por encima y activa
            window.style.zIndex = '2';
            window.classList.remove('inactive');
            window.classList.add('active');
            
            // Actualizar el estado focused de todos los procesos
            Process.forEach(process => {
                process.focused = false;
                // Actualizar la clase del botón del dock
                const dockBtn = document.querySelector(`#dock_btn_${process.pid}`);
                if (dockBtn) {
                    dockBtn.classList.remove('os_dock_active');
                    dockBtn.classList.add('os_dock_open');
                }
            });
            
            // Marcar el proceso actual como enfocado
            Process[processIndex].focused = true;
            
            // Actualizar la clase del botón del dock del proceso enfocado
            const focusedDockBtn = document.querySelector(`#dock_btn_${pid}`);
            if (focusedDockBtn) {
                focusedDockBtn.classList.remove('os_dock_open');
                focusedDockBtn.classList.add('os_dock_active');
            }

            // Limpiar y actualizar el navbar
            resetbtnleftside();
            
            // Añadir el título de la app
            addbtntoleftside(process.appName, [], true);
            
            // Añadir los menús del navbar desde la configuración
            if (process.navMenus) {
                process.navMenus.forEach(menu => {
                    // Reemplazar el PID en las funciones
                    const processedItems = menu.items.map(item => {
                        if (item.function.includes('pid')) {
                            return {
                                ...item,
                                function: item.function.replace('pid', pid)
                            };
                        }
                        return item;
                    });
                    
                    addbtntoleftside(menu.name, processedItems, false);
                });
            }

            // Actualizar el navbar con los menús de la aplicación
            updateNavbarWithAppMenus(process);
        }
    }
}