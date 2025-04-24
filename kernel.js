const { app, BrowserWindow, ipcMain } = require('electron');
const { execFileSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const driversDir = path.join(__dirname, 'System', 'code', 'drivers');

let mainWindow;

function runPythonScript(scriptName, args = []) {
  try {
    const stdout = execFileSync('python', [path.join(driversDir, scriptName), ...args], { encoding: 'utf-8' });
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Error ejecutando ${scriptName}:`, error);
    return null;
  }
}

function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    const powershell = spawn('powershell.exe', ['-Command', command]);
    let stdout = '';
    let stderr = '';

    powershell.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    powershell.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    powershell.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        resolve({ success: false, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });

    powershell.on('error', (error) => {
      reject(error);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

  ipcMain.handle('python-get-volume', () => runPythonScript('volume_controller.py', ['get']));
  ipcMain.handle('python-set-volume', (event, level) => runPythonScript('volume_controller.py', ['set', level.toString()]));
  ipcMain.handle('python-toggle-mute', () => runPythonScript('volume_controller.py', ['toggle']));
  
  ipcMain.handle('python-get-network', () => runPythonScript('network_driver.py', []));
  ipcMain.handle('python-toggle-wifi', () => runPythonScript('network_driver.py', ['toggle']));
  
  ipcMain.handle('python-get-bluetooth', () => runPythonScript('bluetooth_driver.py', []));
  ipcMain.handle('python-toggle-bluetooth', () => runPythonScript('bluetooth_driver.py', ['toggle']));
  
  ipcMain.handle('python-get-battery', () => runPythonScript('battery_driver.py', []));
  
  ipcMain.handle('python-get-airplane', () => runPythonScript('airplane_driver.py', []));
  ipcMain.handle('python-toggle-airplane', () => runPythonScript('airplane_driver.py', ['toggle']));

  ipcMain.handle('execute-powershell', async (event, command) => {
    try {
      return await executePowerShell(command);
    } catch (error) {
      console.error('Error ejecutando PowerShell:', error);
      return { success: false, error: error.message };
    }
  });

  // Manejadores para operaciones de archivos
  ipcMain.handle('check-file-exists', (event, filePath) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('read-file', (event, filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Error al leer el archivo: ${error.message}`);
    }
  });

  ipcMain.handle('write-file', (event, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Error al escribir el archivo: ${error.message}`);
    }
  });

  mainWindow.loadFile('system.html');

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
