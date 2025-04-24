/**
 * Control Center para OceanOS
 * - Se oculta automáticamente si no hay actividad.
 * - Integra funcionalidad real: Wi‑Fi, Bluetooth, Modo Avión y Volumen.
 */
let controlCenterVisible = false;
let controlCenterElement = null;
let ccAutoHideTimer = null;

let systemData = {
  network: { },
  bluetooth: { },
  airplane: { },
  audio: { volume: 50 }
};

/**
 * Alterna la visibilidad del Control Center.
 */
function toggleControlCenter(forceState) {
  controlCenterVisible = (forceState !== undefined) ? forceState : !controlCenterVisible;
  if (controlCenterVisible) {
    showControlCenter();
  } else {
    hideControlCenter();
  }
}

async function showControlCenter() {
  // Si aún no se cargó, crear el contenedor
  if (!controlCenterElement) {
    controlCenterElement = document.createElement('div');
    controlCenterElement.id = 'control-center';
    controlCenterElement.className = 'control-center';
    controlCenterElement.addEventListener('mousemove', resetCcAutoHideTimer);
    document.body.appendChild(controlCenterElement);
    setupOutsideClickHandler();
  }
  // Actualiza la data real:
  systemData.network = await window.pythonAPI.getNetworkStatus();
  systemData.bluetooth = await window.pythonAPI.getBluetoothStatus();
  systemData.airplane = await window.pythonAPI.getAirplaneStatus();
  systemData.audio = await window.pythonAPI.getVolume();
  
  buildControlCenterContent();
  controlCenterElement.style.display = 'block';
  animateControlCenter(true);
  resetCcAutoHideTimer();
}

function hideControlCenter() {
  if (controlCenterElement) {
    animateControlCenter(false, () => {
      controlCenterElement.style.display = 'none';
      removeOutsideClickHandler();
    });
    clearCcAutoHideTimer();
  }
  controlCenterVisible = false;
}

function resetCcAutoHideTimer() {
  clearCcAutoHideTimer();
  ccAutoHideTimer = setTimeout(() => {
    hideControlCenter();
  }, 5000);
}

function clearCcAutoHideTimer() {
  if (ccAutoHideTimer) {
    clearTimeout(ccAutoHideTimer);
    ccAutoHideTimer = null;
  }
}

async function buildControlCenterContent() {
  if (!controlCenterElement) return;
  // Construye la estructura base
  controlCenterElement.innerHTML = `
    <div class="control-grid">
      <!-- Wi‑Fi -->
      <div class="control-tile large" id="cc-wifi">
          <div class="control-icon wifi" style="background-image: url('System/Images/Icons/controlcenter/wifi.png')"></div>
          <div class="control-label">Wi‑Fi</div>
          <div class="control-status" id="cc-wifi-status">Cargando...</div>
          <div class="control-toggle" id="cc-wifi-toggle"></div>
      </div>
      
      <!-- Bluetooth -->
      <div class="control-tile large" id="cc-bluetooth">
          <div class="control-icon bluetooth" style="background-image: url('System/Images/Icons/controlcenter/bluetooth.png')"></div>
          <div class="control-label">Bluetooth</div>
          <div class="control-status" id="cc-bluetooth-status">Cargando...</div>
          <div class="control-toggle" id="cc-bluetooth-toggle"></div>
      </div>
      
      <!-- Modo Avión -->
      <div class="control-tile large" id="cc-airplane">
          <div class="control-icon airplane" style="background-image: url('System/Images/Icons/controlcenter/airplane.png')"></div>
          <div class="control-label">Modo Avión</div>
          <div class="control-status" id="cc-airplane-status">Cargando...</div>
          <div class="control-toggle" id="cc-airplane-toggle"></div>
      </div>
      
      <!-- Volumen -->
      <div class="control-tile slider" id="cc-volume">
          <div class="control-icon volume" style="background-image: url('System/Images/Icons/controlcenter/volume.png')"></div>
          <div class="control-label">Volumen</div>
          <div class="slider-container">
              <div class="slider-track">
                  <div class="slider-progress" id="cc-volume-progress" style="width: ${systemData.audio.volume}%"></div>
                  <div class="slider-thumb" id="cc-volume-thumb" style="left: ${systemData.audio.volume}%"></div>
              </div>
          </div>
      </div>
    </div>
  `;

  // --- Eventos reales:
  // Wi‑Fi toggle: llama al driver para togglear el Wi‑Fi.
  document.getElementById('cc-wifi-toggle').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const result = await window.pythonAPI.toggleWifi();
      if (result && !result.error) {
        systemData.network = result;
      }
      updateControlCenterContent();
      resetCcAutoHideTimer();
    } catch (error) {
      console.error('Error al togglear WiFi:', error);
    }
  });
  
  // Bluetooth toggle:
  document.getElementById('cc-bluetooth-toggle').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const result = await window.pythonAPI.toggleBluetooth();
      if (result && !result.error) {
        systemData.bluetooth = result;
      }
      updateControlCenterContent();
      resetCcAutoHideTimer();
    } catch (error) {
      console.error('Error al togglear Bluetooth:', error);
    }
  });
  
  // Modo Avión toggle:
  document.getElementById('cc-airplane-toggle').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const result = await window.pythonAPI.toggleAirplane();
      if (result && !result.error) {
        systemData.airplane = result;
      }
      updateControlCenterContent();
      resetCcAutoHideTimer();
    } catch (error) {
      console.error('Error al togglear Modo Avión:', error);
    }
  });
  
  // Volumen: Ajuste mediante click sobre el tile.
  document.getElementById('cc-volume').addEventListener('click', async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.round((clickX / rect.width) * 100);
    systemData.audio.volume = newVolume;
    updateControlCenterContent();
    await window.pythonAPI.setVolume(newVolume);
    resetCcAutoHideTimer();
  });
  
  updateControlCenterContent();
}

function updateControlCenterContent() {
    // Wi‑Fi
    const wifiStatus = document.getElementById('cc-wifi-status');
    if (systemData.network && systemData.network.isEnabled) {
      if (systemData.network.isConnected) {
        if (systemData.network.internetStatus === 1)
          wifiStatus.textContent = "Desconectado" + (systemData.network.ssid || "");
        else if (systemData.network.internetStatus === 2)
          wifiStatus.textContent = "Conectado" + (systemData.network.ssid || "");
        else
          wifiStatus.textContent = "Desconocido";
      } else {
        wifiStatus.textContent = "Desconectado";
      }
    } else {
      wifiStatus.textContent = "Desactivado";
    }
  
    // Bluetooth
    const btStatus = document.getElementById('cc-bluetooth-status');
    const btToggle = document.getElementById('cc-bluetooth-toggle');
    if (systemData.bluetooth) {
      btStatus.textContent = systemData.bluetooth.available ? "Activado" : "Desactivado";
      if (systemData.bluetooth.available) {
        btToggle.classList.add('active');
      } else {
        btToggle.classList.remove('active');
      }
    } else {
      btStatus.textContent = "Desactivado";
      btToggle.classList.remove('active');
    }
  
    // Modo Avión
    const airplaneStatus = document.getElementById('cc-airplane-status');
    const airplaneToggle = document.getElementById('cc-airplane-toggle');
    if (systemData.airplane) {
      airplaneStatus.textContent = systemData.airplane.active ? "Activado" : "Desactivado";
      if (systemData.airplane.active) {
        airplaneToggle.classList.add('active');
      } else {
        airplaneToggle.classList.remove('active');
      }
    } else {
      airplaneStatus.textContent = "Desactivado";
      airplaneToggle.classList.remove('active');
    }
    
    // Volumen
    const volumeProgress = document.getElementById('cc-volume-progress');
    const volumeThumb = document.getElementById('cc-volume-thumb');
    if (systemData.audio && systemData.audio.volume !== undefined) {
      volumeProgress.style.width = systemData.audio.volume + '%';
      volumeThumb.style.left = systemData.audio.volume + '%';

      // Aplicar color azul al slider si Bluetooth, WiFi o Ethernet están activos
      const isNetworkActive = systemData.network && systemData.network.isEnabled && systemData.network.isConnected;
      const isBluetoothActive = systemData.bluetooth && systemData.bluetooth.available;
      
      if (isNetworkActive || isBluetoothActive) {
        volumeProgress.style.backgroundColor = '#007AFF';
        volumeThumb.style.backgroundColor = '#007AFF';
      } else {
        volumeProgress.style.backgroundColor = 'rgba(120, 120, 120, 0.4)';
        volumeThumb.style.backgroundColor = 'white';
      }
    }
}

function animateControlCenter(show, callback) {
  if (!controlCenterElement) {
    if (callback) callback();
    return;
  }
  controlCenterElement.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  if (show) {
    controlCenterElement.style.opacity = '0';
    controlCenterElement.style.transform = 'scale(0.9) translateY(10px)';
    void controlCenterElement.offsetWidth;
    controlCenterElement.style.opacity = '1';
    controlCenterElement.style.transform = 'scale(1) translateY(0)';
  } else {
    controlCenterElement.style.opacity = '1';
    controlCenterElement.style.transform = 'scale(1) translateY(0)';
    void controlCenterElement.offsetWidth;
    controlCenterElement.style.opacity = '0';
    controlCenterElement.style.transform = 'scale(0.9) translateY(10px)';
  }
  if (callback) setTimeout(callback, 300);
}

function setupOutsideClickHandler() {
  document.addEventListener('click', handleOutsideClick, { capture: true });
}

function removeOutsideClickHandler() {
  document.removeEventListener('click', handleOutsideClick, { capture: true });
}

function handleOutsideClick(e) {
  if (controlCenterElement && !controlCenterElement.contains(e.target)) {
    hideControlCenter();
  }
}

window.ControlCenter = {
  toggle: toggleControlCenter,
  show: () => toggleControlCenter(true),
  hide: () => toggleControlCenter(false)
};

// Permite actualizar systemData externamente
window.updateSystemData = function(data) {
  systemData = data;
  if (controlCenterVisible) updateControlCenterContent();
};
