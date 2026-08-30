const {
  app,
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");

const makeWASocket =
  require("@whiskeysockets/baileys").default;

const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const QRCode = require("qrcode");

let mainWindow = null;
let sock = null;
let whatsappStatus = "connecting";

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await mainWindow.loadURL(
    "http://localhost:5173"
  );

  console.log("React carregado.");

  connectWhatsApp();
}

async function connectWhatsApp() {

  console.log("Iniciando Baileys...");

  const { state, saveCreds } =
    await useMultiFileAuthState(
      path.join(
        app.getPath("userData"),
        "auth"
      )
    );

  sock = makeWASocket({
    auth: state
  });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  sock.ev.on(
    "connection.update",
    async (update) => {

      const {
        connection,
        lastDisconnect,
        qr
      } = update;

      console.log(
        "CONNECTION UPDATE:",
        {
          connection,
          hasQR: !!qr
        }
      );

      /*
      ==========================
      QR CODE
      ==========================
      */

      if (qr) {

        console.log(
          "QR CODE RECEBIDO"
        );

        const qrDataUrl =
          await QRCode.toDataURL(qr);

        mainWindow.webContents.send(
          "whatsapp-qr",
          qrDataUrl
        );
      }

      /*
      ==========================
      CONECTADO
      ==========================
      */

      if (connection === "open") {

        console.log(
          "WHATSAPP CONECTADO"
        );

        whatsappStatus = "connected";

        mainWindow.webContents.send(
          "whatsapp-status",
          "connected"
        );

        mainWindow.webContents.send(
          "whatsapp-qr",
          null
        );
      }
      /*
      ==========================
      DESCONECTADO
      ==========================
      */

      if (connection === "close") {

        whatsappStatus = "disconnected";

        mainWindow.webContents.send(
          "whatsapp-status",
          "disconnected"
        );

        const code =
          lastDisconnect?.error?.output
            ?.statusCode;

        console.log(
          "WHATSAPP DESCONECTADO:",
          code
        );

        mainWindow.webContents.send(
          "whatsapp-status",
          "disconnected"
        );

        if (
          code !== DisconnectReason.loggedOut
        ) {

          setTimeout(
            connectWhatsApp,
            3000
          );
        }
      }
    }
  );
}


ipcMain.handle(
  "send-message",
  async (_, { number, message }) => {

    if (!sock) {
      throw new Error(
        "WhatsApp não conectado."
      );
    }

    const cleanNumber =
      number.replace(/\D/g, "");

    if (!cleanNumber) {
      throw new Error(
        "Número inválido."
      );
    }

    if (!message.trim()) {
      throw new Error(
        "Mensagem vazia."
      );
    }

   const [result] =
  await sock.onWhatsApp(cleanNumber);

if (!result?.exists) {
  throw new Error(
    `Número ${cleanNumber} não possui WhatsApp.`
  );
}

const jid = result.jid;
    console.log(
      "ENVIANDO PARA:",
      jid
    );

    await sock.sendMessage(
      jid,
      {
        text: message
      }
    );

    return true;
  }
);



ipcMain.handle(
  "logout-whatsapp",
  async () => {

    try {

      if (sock) {
        try {
          await sock.logout();
        } catch (error) {
          console.log(
            "Socket já estava desconectado."
          );
        }

        sock = null;
      }

      const fs = require("fs");

      const authPath = path.join(
        app.getPath("userData"),
        "auth"
      );

      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, {
          recursive: true,
          force: true
        });
      }

      mainWindow.webContents.send(
        "whatsapp-status",
        "disconnected"
      );

      mainWindow.webContents.send(
        "whatsapp-qr",
        null
      );

      // Aguarda um pouco antes de criar
      // uma nova sessão
      setTimeout(() => {
        connectWhatsApp();
      }, 1000);

      return true;

    } catch (error) {

      console.error(
        "Erro ao desconectar:",
        error
      );

      throw error;

    }

  }
);


ipcMain.handle(
  "get-whatsapp-status",
  () => {
    return whatsappStatus;
  }
);

app.whenReady().then(
  createWindow
);

app.on(
  "window-all-closed",
  () => {

    if (
      process.platform !== "darwin"
    ) {
      app.quit();
    }

  }
);