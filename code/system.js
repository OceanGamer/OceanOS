let os_themes_div = "";
let os_themes_canva = "";
let username;
let background;
let profile;

async function addExternalHTML(targetId, htmlPath, del) {
    try {
        const targetElement = document.getElementById(targetId);
        if (!targetElement) {
            console.error(`Elemento con ID ${targetId} no encontrado`);
            return false;
        }

        console.log(`Cargando: ${htmlPath}`);
        const response = await fetch(htmlPath);
        if (!response.ok) {
            console.error(`Error al cargar ${htmlPath}: ${response.statusText}`);
            return false;
        }

        const html = await response.text();
        
        // Usar replaceChildren o insertAdjacentHTML para mejor rendimiento
        if (del) {
            targetElement.replaceChildren();
            targetElement.insertAdjacentHTML('afterbegin', html);
        } else {
            targetElement.insertAdjacentHTML('beforeend', html);
        }

        // Procesar scripts de forma segura
        const scripts = targetElement.querySelectorAll('script');
        const scriptPromises = [];
        
        scripts.forEach(script => {
            if (script.src) {
                // Para scripts externos
                const newScript = document.createElement('script');
                newScript.src = script.src;
                newScript.async = false;
                scriptPromises.push(new Promise(resolve => {
                    newScript.onload = resolve;
                    newScript.onerror = resolve; // Continuar incluso si falla
                }));
                document.head.appendChild(newScript);
            } else {
                // Para scripts inline, ejecutar con eval (cuidado con el contexto)
                try {
                    const scriptContent = script.textContent;
                    const executeScript = new Function(scriptContent);
                    executeScript();
                } catch (e) {
                    console.error('Error ejecutando script inline:', e);
                }
            }
            script.remove();
        });

        await Promise.all(scriptPromises);
        console.log(`Carga completada: ${htmlPath}`);
        return true;
    } catch (error) {
        console.error(`Error en addExternalHTML (${htmlPath}):`, error);
        return false;
    }
}

function os_loadDesktop(){
    // Transición suave del lockscreen al escritorio
    const lockScreen = document.getElementById("os_lockscreen");
    if (lockScreen) {
        lockScreen.classList.add('hidden');
    }
    
    // Crear el área de trabajo
    const workarea = document.createElement('div');
    workarea.className = 'os_workarea';
    os_themes_canva.appendChild(workarea);
    
    // Agregar previsualizadores de snap
    const snapPreviews = document.createElement('div');
    snapPreviews.className = 'snap-previews-container';
    snapPreviews.innerHTML = `
        <div class="snap-preview left"></div>
        <div class="snap-preview right"></div>
    `;
    workarea.appendChild(snapPreviews);
    
    // Esperar a que termine la animación antes de mostrar el escritorio
    setTimeout(() => {
        if (lockScreen) {
            lockScreen.remove();
        }
        
        // Mostrar el área de trabajo con animación
        workarea.classList.add('visible');
        
        // Agregar el dock
        addExternalHTML('os_canvas', 'System/html/os_dock.html', false);

        addExternalHTML('os_canvas', 'System/html/os_startMenu.html', false);
        
        // Esperar a que se cargue el dock y mostrar con animación
        setTimeout(() => {
            const dock = document.querySelector('.os_dock');
            if (dock) {
                dock.classList.add('visible');
                // Cargar las apps ancladas después de que el dock esté visible
                loadDockApps();
            }
        }, 100);
    }, 500);
}

// Función auxiliar para pausar la ejecución
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function os_loadingScreen() {
    os_themes_div.innerHTML = '<link id="css_loadingos" rel="stylesheet" href="System/themes/loadingOS.css">';
    
    try {
        // Etapa 1: Cargando OceanOS...
        await addExternalHTML('os_canvas', 'System/html/os_loading.html', true);
        const logo = document.querySelector('.os_bootLogo');
        if (logo) logo.classList.add('initial-load');
        updateBootStatus("Cargando OceanOS...", 0);
        await sleep(2000);
        
        // Etapa 2: Buscando usuario...
        updateBootStatus("Buscando usuario...", 30);
        await sleep(500);
        
        let userData = null;
        try {
            const response = await fetch('Data/OS/user.json');
            userData = await response.json();
        } catch (error) {
            os_createUser();
            return;
        }
        
        // Etapa 3: Cargando usuario...
        updateBootStatus("Cargando usuario...", 40);
        await sleep(500);
        
        if (userData && userData.username && userData.password) {
            username = userData.username;
            background = userData.background;
            profile = userData.profile;
            
            // Etapa 4: Cargando controladores...
            updateBootStatus("Cargando controladores...", 50);
            if (logo) logo.classList.remove('initial-load');
            await sleep(1000);
            
            // Cargar navbar bloqueado
            await addExternalHTML('os_canvas', 'System/html/os_nav.html', false);
                    
            // Etapa 5: Construyendo escritorio...
            updateBootStatus("Construyendo escritorio...", 70);
            await sleep(1000);
            
            await addExternalHTML('os_canvas', 'System/html/os_lockscreen.html', false);
            
            // Etapa 6: Cargando escritorio...
            updateBootStatus("Cargando escritorio...", 80);
            await sleep(1000);
            
            // Configurar avatar y fondo
            if (profile == "") {
                document.getElementById("os_lockscreen_avatar").style.backgroundImage = "url('System/Images/Icons/default/defaultUser.png')";
            } else {
                document.getElementById("os_lockscreen_avatar").style.backgroundImage = "url('"+profile+"')";
            }
            
            if (background == "") {
                document.getElementById("os_body").style.backgroundImage = "url('System/Images/Backgrounds/sunsetroad.png')";
            } else {
                document.getElementById("os_body").style.backgroundImage = "url('"+background+"')";
            }
            
            document.getElementById("os_lockscreen_username").textContent = username;
            
            // Etapa final: Terminado...
            updateBootStatus("Terminando...", 100);
            await sleep(2000);
            
            // Transición suave del boot al lockscreen
            const bootContainer = document.getElementById("os_bootContainer");
            const lockScreen = document.getElementById("os_lockscreen");
            
            if (bootContainer && lockScreen) {
                // Mostrar el lockscreen antes de ocultar el boot
                lockScreen.classList.add('visible');
                await sleep(100); // Pequeña pausa para asegurar que el lockscreen está listo
                
                // Ocultar el boot
                bootContainer.classList.add('hidden');
                await sleep(500); // Esperar a que termine la animación
            }
            
            // Reproducir sonido de inicio
            const audio = new Audio('System/audio/boot.mp3');
            audio.volume = 0.5;
            audio.play().catch(error => {
                console.error('Error al reproducir el sonido de inicio:', error);
            });
        } else {
            os_createUser();
        }
    } catch (error) {
        os_errorScreen("0x00002", "Reinstala el sistema para solucionar el problema");
    }
}

function updateBootStatus(newStatus, percentaje) {
    const progressBar = document.getElementById('os_progressBar');
    const statusText = document.getElementById('os_bootStatus');
    if (progressBar && statusText) {
        progressBar.style.width = percentaje + '%';
        statusText.textContent = newStatus;
    }      
}

function os_errorScreen(error, solution) {
    console.error("Ha ocurrido un error fatal: "+error+" "+solution);
}

function os_createUser() {
    console.log("create new username");
}

window.addEventListener('load', function() {
    os_themes_div = document.getElementById("os_themes");
    os_themes_canva = document.getElementById("os_canvas");
    if (!os_themes_div || !os_themes_canva) {
        os_errorScreen("0x00001", "Reinstala el sistema para solucionar el problema");
    } else {
        os_loadingScreen();
    }
});