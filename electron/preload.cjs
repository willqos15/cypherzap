const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("whatsapp", {

onQR: (callback) => {
  console.log("REGISTRANDO LISTENER DO QR");

  const listener = (_, qr) => {
    console.log("QR RECEBIDO NO PRELOAD:", qr);
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

obterHistoricoEnvios: () => {
  return ipcRenderer.invoke(
    "historico:get-envios"
  );
},

onHistoricoEnvioAtualizado: (callback) => {
  const listener = (_event, dados) => {
    callback(dados);
  };

  ipcRenderer.on(
    "historico:envio-atualizado",
    listener
  );

  

  return () => {
    ipcRenderer.removeListener(
      "historico:envio-atualizado",
      listener
    );
  };
},



onWhatsappSessionChanged: (callback) => {
    const listener = (_, numero) => {
        callback(numero);
    };

    ipcRenderer.on(
        "whatsapp-session-changed",
        listener
    );

    return () => {
        ipcRenderer.removeListener(
            "whatsapp-session-changed",
            listener
        );
    };
},

registrarPendentes: (
  listaId,
  numeros,
  mensagens
) => {
  return ipcRenderer.invoke(
    "historico:registrar-pendentes",
    {
      listaId,
      numeros,
      mensagens
    }
  );
},

enviarMensagem: (
  number,
  message,
  attachment,
  listaId,
  historicoId
) => {
  return ipcRenderer.invoke(
    "send-message",
    {
      number,
      message,
      attachment,
      listaId,
      historicoId
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

exportContacts: () => {
    return ipcRenderer.invoke("whatsapp:export-contacts");
},

getContactsCount: () => {
  return ipcRenderer.invoke(
    "whatsapp:get-contacts-count"
  );
},

exportAllGroupNumbers: () =>
    ipcRenderer.invoke(
        "whatsapp:export-all-group-numbers"
    ),

onContactsCount: (callback) => {
  const listener = (_event, count) => {
    callback(count);
  };

  ipcRenderer.on(
    "whatsapp-contacts-count",
    listener
  );

  return () => {
    ipcRenderer.removeListener(
      "whatsapp-contacts-count",
      listener
    );
  };
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