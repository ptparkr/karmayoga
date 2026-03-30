const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  checkIn: (response) => ipcRenderer.invoke('check-in', response),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getToday: () => ipcRenderer.invoke('get-today'),

  onAppReady: (callback) => {
    ipcRenderer.on('app-ready', () => callback());
  },
  onShowCheckin: (callback) => {
    ipcRenderer.on('show-checkin', () => callback());
  }
});
