const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("whatsapp", {

  onQR: (callback) => {
  const listener = (_, qr) => {
    callback(qr);
  };

  ipcRenderer.on("whatsapp-qr", listener);

  return () => {
    ipcRenderer.removeListener(
      "whatsapp-qr",
      listener
    );
  };
},

 onStatus: (callback) => {
  const listener = (_event, status) => {
    callback(status);
  };

  ipcRenderer.on(
    "whatsapp-status",
    listener
  );

  return () => {
    ipcRenderer.removeListener(
      "whatsapp-status",
      listener
    );
  };
},

  enviarMensagem: (number, message,  attachment) => {
    return ipcRenderer.invoke(
      "send-message",
      {
        number,
        message,
        attachment
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



  getLicense: () => {
  return ipcRenderer.invoke(
    "get-whatsapp-license"
  );
},


 getWhatsAppGroups: () => {
    return ipcRenderer.invoke("whatsapp:get-groups");
  },

  exportGroupNumbers: (groupId) => {
    return ipcRenderer.invoke("whatsapp:export-group-numbers", groupId);
  },

    onLicense: (callback) => {
      const listener = (_event, license) => {
        callback(license);
      };

      ipcRenderer.on(
        "whatsapp-license",
        listener
      );

   
      return () => {
        ipcRenderer.removeListener(
          "whatsapp-license",
          listener
        );
      };
    },



});