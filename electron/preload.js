const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("whatsapp", {

  onQR: (callback) => {
    ipcRenderer.on("whatsapp-qr", (_, qr) => {
      callback(qr);
    });
  },

  onStatus: (callback) => {
    ipcRenderer.on(
      "whatsapp-status",
      (_, status) => {
        callback(status);
      }
    );
  },

  enviarMensagem: (number, message) => {
    return ipcRenderer.invoke(
      "send-message",
      {
        number,
        message
      }
    );
  },

   desconectar: () => {
    return ipcRenderer.invoke(
      "logout-whatsapp"
    );
  },

  getStatus: () => {
  return ipcRenderer.invoke(
    "get-whatsapp-status"
  );
},

});