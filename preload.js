const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('systemAPI', {
  executeBash: (command) => ipcRenderer.invoke('execute-bash', command)
});