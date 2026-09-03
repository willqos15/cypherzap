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
const { env } = require("process");

let mainWindow = null;
let sock = null;
let whatsappStatus = "connecting";
let licencaAtual = null;


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


function normalizePhone(value){

  let clean = String(value ?? "").replace(/\D/g, "");

  if (!clean) {

    return "";

  }

  // Remove o código do Brasil

  if (clean.startsWith("55")) {

    clean = clean.slice(2);

  }

  // Deve ser DDD + telefone

  if (clean.length !== 10 && clean.length !== 11) {

    return "";

  }

  const ddd = clean.slice(0, 2);

  const phone = clean.slice(2);

  // Celular antigo sem o 9

  // Ex.: 93 91878598

  //      ↓

  //     93 991878598

  if (

    phone.length === 8 &&

    phone.startsWith("9")

  ) {

    return `55${ddd}9${phone}`;

  }

  // Celular já com o 9

  // Ex.: 93 991878598

  if (

    phone.length === 9 &&

    phone.startsWith("9")

  ) {

    return `55${ddd}${phone}`;

  }

  // Telefone fixo

  if (phone.length === 8) {

    return `55${ddd}${phone}`;

  }

  return "";

}

async function atualizarLicenca(numero) {
  try {
    const resultado = await verificarLicenca(numero);

    licencaAtual = {
      autorizado: resultado.autorizado,
      numero,
      validade: resultado.validade ?? null,
      motivo: resultado.motivo,
    };

    console.log("LICENÇA ATUAL:", licencaAtual);

    enviarLicencaParaFront();

    return licencaAtual;

  } catch (error) {
    console.error(
      "Erro ao atualizar licença:",
      error
    );

    licencaAtual = {
      autorizado: false,
      numero,
      validade: null,
      motivo: "Não foi possível verificar a licença",
    };

    enviarLicencaParaFront();

    return licencaAtual;
  }
}

    



async function verificarLicenca(numero) {
  try {
    // =========================
    // 1. Normaliza o número
    // =========================

    const numeroNormalizado = normalizePhone(numero);

    console.log("Número original:", numero);
    console.log("Número normalizado:", numeroNormalizado);

    if (!numeroNormalizado) {
      console.error("Número inválido:", numero);

      return {
        autorizado: false,
        validade: null,
        numero: null,
        erro: "NUMERO_INVALIDO",
        motivo: "Número de WhatsApp inválido",
      };
    }

    // =========================
    // 2. Monta URL do Worker
    // =========================

    const url =
      "https://cypherzap-licenca.willqos15.workers.dev/licenca" +
      `?numero=${encodeURIComponent(numeroNormalizado)}`;

    console.log("Consultando Cloudflare Worker:");
    console.log(url);

    // =========================
    // 3. Faz requisição
    // =========================

    const response = await fetch(url);

    console.log("HTTP:", response.status);
    console.log("OK:", response.ok);

    // =========================
    // 4. Pega resposta
    // =========================

    const texto = await response.text();

    console.log("Resposta bruta do Cloudflare:");
    console.log(texto);

    // =========================
    // 5. Verifica HTTP
    // =========================

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${texto}`
      );
    }

    // =========================
    // 6. Converte para JSON
    // =========================

    let resultado;

    try {
      resultado = JSON.parse(texto);
    } catch (error) {
      console.error(
        "Resposta do Cloudflare não é JSON:",
        texto
      );

      throw new Error(
        `Resposta não é JSON válido: ${texto}`
      );
    }

    // =========================
    // 7. Exibe resultado
    // =========================

    console.log(
      "Resultado da verificação:",
      resultado
    );

    // =========================
    // 8. Licença não autorizada
    // =========================

    if (!resultado.autorizado) {
      console.error(
        "LICENÇA NÃO AUTORIZADA"
      );

      console.error(
        "Código do erro:",
        resultado.erro
      );

      console.error(
        "Motivo:",
        resultado.motivo
      );
    }

    // =========================
    // 9. Retorna resultado
    // =========================

    return resultado;

  } catch (error) {
    // =========================
    // 10. Erro de conexão
    // =========================

    console.error(
      "ERRO AO VERIFICAR LICENÇA:"
    );

    console.error(
      "Objeto completo:",
      error
    );

    console.error(
      "Mensagem:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return {
      autorizado: false,
      validade: null,
      numero: null,
      erro: "ERRO_CONEXAO",
      motivo:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
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
    auth: state,
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
        qr,
      } = update;

      console.log(
        "CONNECTION UPDATE:",
        {
          connection,
          hasQR: !!qr,
        }
      );

      // =========================
      // QR CODE
      // =========================

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

      // =========================
      // CONECTADO
      // =========================

      if (connection === "open") {
  console.log("WHATSAPP CONECTADO");

  whatsappStatus = "connected";

  mainWindow.webContents.send(
    "whatsapp-status",
    "connected"
  );

  mainWindow.webContents.send(
    "whatsapp-qr",
    null
  );

  const numero = sock.user.id
    .split(":")[0]
    .replace(/\D/g, "");

  console.log(
    "Número conectado:",
    numero
  );

  await atualizarLicenca(numero);
}

      // =========================
      // DESCONECTADO
      // =========================

      if (connection === "close") {
        whatsappStatus =
          "disconnected";

        // Apenas informa conexão
        mainWindow.webContents.send(
          "whatsapp-status",
          "disconnected"
        );

        // Remove QR
        mainWindow.webContents.send(
          "whatsapp-qr",
          null
        );

        const code =
          lastDisconnect?.error
            ?.output?.statusCode;

        console.log(
          "WHATSAPP DESCONECTADO:",
          code
        );

        // =========================
        // RECONEXÃO
        // =========================

        if (
          code !==
          DisconnectReason.loggedOut
        ) {
          console.log(
            "Tentando reconectar em 3 segundos..."
          );

          setTimeout(
            connectWhatsApp,
            3000
          );
        } else {
          console.log(
            "WhatsApp foi deslogado."
          );
        }
      }
    }
  );
}


ipcMain.handle(
  "send-message",
  async (_, { number, message, attachment }) => {
  

    if (!licencaAtual?.autorizado) {
      throw new Error(
        licencaAtual?.motivo || "Licença não autorizada."
      );
    }

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

    // Precisa existir pelo menos
    // uma mensagem OU um anexo
    if (!message?.trim() && !attachment) {
      throw new Error(
        "Mensagem vazia e nenhum anexo."
      );
    }

    // =========================
    // VERIFICA WHATSAPP
    // =========================

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

    // =========================
    // SEM ANEXO
    // =========================

    if (!attachment) {
      await sock.sendMessage(
        jid,
        {
          text: message.trim()
        }
      );

      return true;
    }

    // =========================
    // CONVERTE ARRAYBUFFER
    // =========================

    const buffer =
      Buffer.from(
        attachment.buffer
      );

    // =========================
    // ANEXO
    // =========================

    switch (attachment.type) {
      case "image":
        await sock.sendMessage(
          jid,
          {
            image: buffer,
            mimetype:
              attachment.mimetype,
            caption:
              message?.trim() || undefined
          }
        );
        break;

      case "video":
        await sock.sendMessage(
          jid,
          {
            video: buffer,
            mimetype:
              attachment.mimetype,
            caption:
              message?.trim() || undefined
          }
        );
        break;

      case "audio":
        await sock.sendMessage(
          jid,
          {
            audio: buffer,
            mimetype:
              attachment.mimetype
          }
        );
        break;

      case "document":
        await sock.sendMessage(
          jid,
          {
            document: buffer,
            mimetype:
              attachment.mimetype,
            fileName:
              attachment.fileName,
            caption:
              message?.trim() || undefined
          }
        );
        break;

      default:
        throw new Error(
          "Tipo de anexo não suportado."
        );
    }

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

      licencaAtual = null;

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

function enviarLicencaParaFront() {
  if (!mainWindow) return;

  mainWindow.webContents.send(
    "whatsapp-license",
    licencaAtual
  );
}



ipcMain.handle(
  "get-whatsapp-status",
  () => {
    return whatsappStatus;
  }
);

ipcMain.handle(
  "get-whatsapp-license",
  async () => {
    if (!sock?.user?.id) {
      return null;
    }

    const numero = sock.user.id
      .split(":")[0]
      .replace(/\D/g, "");

    return await atualizarLicenca(numero);
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