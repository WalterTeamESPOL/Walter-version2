const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld(
  "walterElectron",
  {
    setHeadState(state) {
      ipcRenderer.send(
        "walter-head:set-state",
        state
      );
    },
  }
);