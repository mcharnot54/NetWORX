const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any specific APIs you need here
  // For example:
  // openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // getVersion: () => ipcRenderer.invoke('get-version')
});
