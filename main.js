const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'streak-data.json');

function getInitialData() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCheckIn: null,
    checkInHistory: {},
    createdAt: new Date().toISOString().split('T')[0]
  };
}

function loadData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return getInitialData();
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 360,
    height: 520,
    x: screenWidth - 380,
    y: screenHeight - 540,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('app-ready');
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'icon.png');
  let trayIcon;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGxSURBVFiF7ZY9TsNAEIW/NZEROQFSJChxA1yAG3ADbkJR4AacgBtQFCgKOAGiQYFCiUL/wA1ISChE2Ti7tmM7dhKTtJO1vjfezNq1GfjfMgL6wAboAq8RcB9YAY/AXWTsGbgAJ6ANXIExcA+8RsZawCPwCPSBE9CHbYB7YA8MgKfI2BB4Aa5AH3gGesA6MgZcAyNgFRl7B0bAMjL2CIyARWTsDRgBi8jYGzAC5pGxV2AELCJjr8AImEfGXoARMIuMvQAjYBYZewFGwCwy9gKMgFlk7AUYAbPI2AswAmaRsRdgBMwiYy/ACJhFxl6AETCLjL0AI2AWGXsBRsAsMvYCjIBZZOwFGAH/LoCIlh+BTxHxJWA9MtaPDPWANXABPKJgPaARGeuCW+AM+ATuwB2wi4z1wC1wDLwAr5GxLriLAO6AI2ARGeuCW+AYeASeI2NdYIX/9oErYBoZ6wIr/LcfuAKmkbEusMJ/+4ErYBoZ6wIr/LcfuAKmkbEusMJ/+4ErYBoZ6wIr/LcfuAKmkbEusMJ/+4ErYBYZ6wIr/LcfuAJmkbEusMJ/+4ErYBYZ6wIr/LcfuAJmkbEusMJ/+4ErYBYZ6wIr/LcfuAJmkbEusMJ/+4ErYBoZ6wIr/LcfuAJmkbEusMJ/+4ErYBoZ6wIr/LcfuAJmkbEusMJ/+4ErYBoZ6wIr/LcfuAJmkbEusMJ/+4H/Az8BD1e5gNdXAAAAAElFTkSuQmCC') : trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Widget',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Check In',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('show-checkin');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        setAutoStart(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Progress Tracker');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function setAutoStart(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    path: app.getPath('exe')
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setAutoStart(false);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

ipcMain.handle('get-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  return saveData(data);
});

ipcMain.handle('check-in', (event, response) => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (response === 'yes') {
    if (data.lastCheckIn === today) {
      return { success: true, alreadyChecked: true, data };
    }

    if (data.lastCheckIn === yesterday) {
      data.currentStreak += 1;
    } else {
      data.currentStreak = 1;
    }

    if (data.currentStreak > data.longestStreak) {
      data.longestStreak = data.currentStreak;
    }

    data.checkInHistory[today] = true;
    data.lastCheckIn = today;
  } else if (response === 'no') {
    data.currentStreak = 0;
    data.lastCheckIn = today;
  }

  saveData(data);
  return { success: true, alreadyChecked: false, data };
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('get-today', () => {
  return new Date().toISOString().split('T')[0];
});

ipcMain.handle('get-autostart', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-autostart', (event, enabled) => {
  setAutoStart(enabled);
  return enabled;
});
