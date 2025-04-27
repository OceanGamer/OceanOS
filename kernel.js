const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function executeDebianBash(command) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      if (error) {
        reject({ success: false, error: error.message, stderr });
        return;
      }
      resolve({ success: true, output: stdout.trim() });
    });
  });
}

function createWindow() {
  // Obtener las dimensiones de la pantalla
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    fullscreen: true, // Esto asegura que esté en modo pantalla completa
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    }
  });

  // Configuración de headers CORS
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type']
      }
    });
  });

  ipcMain.handle('execute-bash', async (event, command) => {
    try {
      return await executeDebianBash(command);
    } catch (error) {
      console.error('Error ejecutando el bash:', error);
      return { success: false, error: error.message };
    }
  });

  mainWindow.loadFile('system.html');

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
