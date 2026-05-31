const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("checkersHost", {
  startServer: (port) => ipcRenderer.invoke("server:start", port),
  stopServer: () => ipcRenderer.invoke("server:stop")
});
