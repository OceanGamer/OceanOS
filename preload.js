const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pythonAPI', {
  getVolume: () => ipcRenderer.invoke('python-get-volume'),
  setVolume: (level) => ipcRenderer.invoke('python-set-volume', level),
  toggleMute: () => ipcRenderer.invoke('python-toggle-mute'),
  
  getNetworkStatus: () => ipcRenderer.invoke('python-get-network'),
  toggleWifi: () => ipcRenderer.invoke('python-toggle-wifi'),
  
  getBluetoothStatus: () => ipcRenderer.invoke('python-get-bluetooth'),
  toggleBluetooth: () => ipcRenderer.invoke('python-toggle-bluetooth'),
  
  getBatteryStatus: () => ipcRenderer.invoke('python-get-battery'),
  
  getAirplaneStatus: () => ipcRenderer.invoke('python-get-airplane'),
  toggleAirplane: () => ipcRenderer.invoke('python-toggle-airplane'),

  executePowerShell: (command) => ipcRenderer.invoke('execute-powershell', command),

  // Funciones para manejo de archivos
  checkFileExists: (path) => ipcRenderer.invoke('check-file-exists', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content)
});
