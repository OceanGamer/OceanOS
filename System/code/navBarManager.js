function addbtntoleftside(name, contextualMenu, title, logoPath, packageName) {
    const leftside = document.getElementById('os_navbar_appinfo');
    
    // Crear el botón con el logo
    if (logoPath) {
        const logoButton = document.createElement('button');
        logoButton.className = 'os_navbar_osbtn';
        logoButton.style.backgroundImage = `url(${logoPath})`;
        
        // Añadir evento de clic para el menú contextual del logo
        logoButton.addEventListener('click', (e) => {
            e.preventDefault();
            const menu = ContextMenuManager.createNewContextMenu(logoButton, e.clientX, e.clientY);
            
            // Añadir opciones del menú contextual
            ContextMenuManager.addNewContextBtn('Abrir nueva ventana', null, () => {
                StartProcess(packageName);
            });
            
            ContextMenuManager.addNewContextBtn('Cerrar ventana actual', null, () => {
                closeProcess(Process.find(p => p.packageName === packageName).pid);
            });
            
            ContextMenuManager.addContextMenuSeparator();
            
            // Verificar si la app está anclada en el dock
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
            
            // Verificar si la app está anclada en el inicio
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
        
        leftside.appendChild(logoButton);
    }
    
    // Crear el botón con el nombre
    const button = document.createElement('button');
    button.className = 'os_navbar_control_btn';
    button.textContent = name;
    
    // Si es un título, añadir clase especial y menú contextual de la app
    if (title) {
        button.classList.add('os_navbar_title');
        
        // Añadir evento de clic para el menú contextual del título
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const menu = ContextMenuManager.createNewContextMenu(button, e.clientX, e.clientY);
            
            // Añadir opciones del menú contextual
            ContextMenuManager.addNewContextBtn('Abrir nueva ventana', null, () => {
                StartProcess(packageName);
            });
            
            ContextMenuManager.addNewContextBtn('Cerrar ventana actual', null, () => {
                closeProcess(Process.find(p => p.packageName === packageName).pid);
            });
            
            ContextMenuManager.addContextMenuSeparator();
            
            // Verificar si la app está anclada en el dock
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
            
            // Verificar si la app está anclada en el inicio
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
    } else {
        // Para los demás botones, usar el menú contextual proporcionado
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const menu = ContextMenuManager.createNewContextMenu(button, e.clientX, e.clientY);
            
            // Añadir cada opción del menú contextual
            contextualMenu.forEach(item => {
                if (item.type === 'addNewContextualBtn') {
                    ContextMenuManager.addNewContextBtn(item.name, null, () => {
                        eval(item.function);
                    });
                } else if (item.type === 'addNewSeparator') {
                    ContextMenuManager.addContextMenuSeparator();
                }
            });
        });
    }
    
    // Añadir el botón al navbar
    leftside.appendChild(button);
}

function resetbtnleftside() {
    const leftside = document.getElementById('os_navbar_appinfo');
    // Eliminar todos los botones
    leftside.innerHTML = '';
}

// Función para actualizar el navbar con los menús de una aplicación
function updateNavbarWithAppMenus(process) {
    // Limpiar el navbar
    resetbtnleftside();
    
    // Añadir el logo y título de la app
    const logoPath = `Apps/${process.packageName}/appContainer/${process.appLogo}`;
    addbtntoleftside(process.appName, [], true, logoPath, process.packageName);
    
    // Añadir los menús del navbar desde la configuración
    if (process.navMenus && Array.isArray(process.navMenus)) {
        process.navMenus.forEach(menu => {
            // Reemplazar el PID en las funciones
            const processedItems = menu.items.map(item => {
                if (item.function && item.function.includes('pid')) {
                    return {
                        ...item,
                        function: item.function.replace('pid', process.pid)
                    };
                }
                return item;
            });
            
            addbtntoleftside(menu.name, processedItems, false);
        });
    }
}

function updateTime() {
    const timeElement = document.getElementById('os_navbar_time');
    const now = new Date();
    
    const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const timeString = `${dayName} ${day} ${month}, ${hours}:${minutes} ${ampm}`;
    timeElement.textContent = timeString;
}

// Actualizar la hora cada segundo
setInterval(updateTime, 1000);
updateTime(); // Llamar inmediatamente para mostrar la hora

function updateSystemIndicators() {
    const controlContainer = document.getElementById('os_navbar_control');
    
    // Actualizar indicadores
    updateNetworkStatus(controlContainer);
    updateVolumeStatus(controlContainer);
    updateBatteryStatus(controlContainer);
    updateBluetoothStatus(controlContainer);

    // Mostrar estado actual en consola
    console.log('=== Estado del Sistema ===');
    console.log('Actualizado:', new Date().toLocaleTimeString());
}

async function updateNetworkStatus(container) {
    let networkIndicator = document.getElementById('network_indicator');
    
    if (!networkIndicator) {
        networkIndicator = document.createElement('button');
        networkIndicator.id = 'network_indicator';
        networkIndicator.className = 'os_navbar_osbtn';
        container.appendChild(networkIndicator);
    }

    try {
        // Obtener estado WiFi
        const wifiResponse = await executeSystemCommand('gwifi');
        const wifiData = JSON.parse(wifiResponse.output);

        // Obtener estado Ethernet
        const ethernetResponse = await executeSystemCommand('gethernet');
        const ethernetData = JSON.parse(ethernetResponse.output);

        if (ethernetData.ethernet === "true" && ethernetData.internet === "true") {
            networkIndicator.style.backgroundImage = 'url(System/Images/Icons/network/ethernet_on.png)';
            console.log('Red: Ethernet conectado (con Internet)');
        } else if (wifiData.wifi === "enabled" && wifiData.internet === "true") {
            networkIndicator.style.backgroundImage = 'url(System/Images/Icons/network/wifi_on.png)';
            console.log('Red: WiFi conectado (con Internet)');
        } else {
            networkIndicator.style.backgroundImage = 'url(System/Images/Icons/network/network_off.png)';
            console.log('Red: Sin conexión');
        }
    } catch (error) {
        networkIndicator.style.backgroundImage = 'url(System/Images/Icons/network/network_off.png)';
        console.log('Red: Error al obtener estado -', error);
    }
}

async function updateVolumeStatus(container) {
    let volumeIndicator = document.getElementById('volume_indicator');
    
    if (!volumeIndicator) {
        volumeIndicator = document.createElement('button');
        volumeIndicator.id = 'volume_indicator';
        volumeIndicator.className = 'os_navbar_osbtn';
        container.appendChild(volumeIndicator);
    }

    const response = await executeSystemCommand('gvolume');
    const volume = JSON.parse(response.output);
    
    if (volume.muted === "[off]") {
        volumeIndicator.style.backgroundImage = 'url(System/Images/Icons/volume/volumeMute.png)';
        console.log('Volumen: Silenciado');
    } else if (parseInt(volume.level) > 66) {
        volumeIndicator.style.backgroundImage = 'url(System/Images/Icons/volume/volumeHigh.png)';
        console.log('Volumen: Alto (' + volume.level + '%)');
    } else if (parseInt(volume.level) > 33) {
        volumeIndicator.style.backgroundImage = 'url(System/Images/Icons/volume/volumeMedium.png)';
        console.log('Volumen: Medio (' + volume.level + '%)');
    } else {
        volumeIndicator.style.backgroundImage = 'url(System/Images/Icons/volume/volumeLow.png)';
        console.log('Volumen: Bajo (' + volume.level + '%)');
    }
}

async function updateBatteryStatus(container) {
    let batteryIndicator = document.getElementById('battery_indicator');
    
    if (!batteryIndicator) {
        batteryIndicator = document.createElement('button');
        batteryIndicator.id = 'battery_indicator';
        batteryIndicator.className = 'os_navbar_osbtn';
        batteryIndicator.style.color = "white";
        container.appendChild(batteryIndicator);
    }

    try {
        const response = await executeSystemCommand('gbattery');
        const battery = JSON.parse(response.output);

        if (battery.has_battery) {
            // Caso con batería
            batteryIndicator.textContent = `${battery.percent}%`;
            if (battery.power_plugged === "1") {
                batteryIndicator.classList.add('charging');
                console.log('Batería: ' + battery.percent + '% (Cargando)');
            } else {
                batteryIndicator.classList.remove('charging');
                console.log('Batería: ' + battery.percent + '%');
            }
        } else {
            // Caso sin batería (solo fuente de poder)
            batteryIndicator.textContent = "AC";
            batteryIndicator.classList.add('charging');
            console.log('Sistema conectado a fuente de poder (sin batería)');
        }
    } catch (error) {
        batteryIndicator.style.display = 'none';
        console.log('Error al obtener estado de energía:', error);
    }
}

async function updateBluetoothStatus(container) {
    let bluetoothIndicator = document.getElementById('bluetooth_indicator');
    
    if (!bluetoothIndicator) {
        bluetoothIndicator = document.createElement('button');
        bluetoothIndicator.id = 'bluetooth_indicator';
        bluetoothIndicator.className = 'os_navbar_osbtn';
        container.appendChild(bluetoothIndicator);
    }

    try {
        const response = await executeSystemCommand('gbluetooth');
        const bluetooth = JSON.parse(response.output);

        bluetoothIndicator.style.display = 'block';
        bluetoothIndicator.classList.toggle('active', bluetooth.enabled === "true");
        bluetoothIndicator.style.backgroundImage = 'url(System/Images/Icons/bluetooth/bluetooth.png)';
        console.log('Bluetooth: ' + (bluetooth.enabled === "true" ? 'Activado' : 'Desactivado'));
    } catch (error) {
        bluetoothIndicator.style.display = 'none';
        console.log('Bluetooth: No disponible');
    }
}

// Actualizar batería y volumen cada 1 segundo
setInterval(() => {
    updateBatteryStatus(document.getElementById('os_navbar_control'));
    updateVolumeStatus(document.getElementById('os_navbar_control'));
}, 1000);

// Actualizar red y Bluetooth cada 5 segundos
setInterval(() => {
    updateNetworkStatus(document.getElementById('os_navbar_control'));
    updateBluetoothStatus(document.getElementById('os_navbar_control'));
}, 5000);

// Actualizar inmediatamente al cargar
updateSystemIndicators();