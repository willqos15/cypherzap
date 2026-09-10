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
let whatsappQR = null;

let mainWindow = null;
let sock = null;
let whatsappStatus = "connecting";
let licencaAtual = null;
let reconnectTimeout = null;
let manualLogout = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}


function scheduleReconnect(delay) {
  if (reconnectTimeout) {
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    manualLogout = false;

    if (!sock) {
      connectWhatsApp();
    }
  }, delay);
}


app.whenReady().then(async () => {
  createWindow();

  try {
    await connectWhatsApp();
  } catch (error) {
    console.error("Erro ao iniciar WhatsApp:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function normalizePhone(value) {

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

const fs = require("fs");

async function connectWhatsApp() {
  console.log("Iniciando Baileys...");

  const authPath = path.join(
    app.getPath("userData"),
    "auth"
  );




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


      console.log("CONNECTION UPDATE COMPLETO:");
      console.log(update);

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
        console.log("QR CODE RECEBIDO");


        const qrDataUrl = await QRCode.toDataURL(qr);

        whatsappQR = qrDataUrl;

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            "whatsapp-qr",
            qrDataUrl
          );
        }
      }

      // =========================
      // CONECTADO
      // =========================

      if (connection === "open") {
        console.log("WHATSAPP CONECTADO");
        console.log("==========");
        console.log("BAILEYS: CONECTOU");
        console.log("==========");

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
        whatsappStatus = "disconnected";

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            "whatsapp-status",
            "disconnected"
          );

          mainWindow.webContents.send(
            "whatsapp-qr",
            null
          );
        }

        const code =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          "WHATSAPP DESCONECTADO:",
          code
        );

        sock = null;
        if (manualLogout) {
          return;
        }
        licencaAtual = null;

        // =========================
        // SESSÃO INVÁLIDA
        // =========================

        if (code === DisconnectReason.loggedOut) {
          console.log(
            "Sessão inválida. Removendo autenticação..."
          );

          const authPath = path.join(
            app.getPath("userData"),
            "auth"
          );

          try {
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, {
                recursive: true,
                force: true
              });

              console.log(
                "AUTH removido."
              );
            }
          } catch (error) {
            console.error(
              "Erro ao remover AUTH:",
              error
            );
          }

          // Inicia uma sessão limpa
          scheduleReconnect(1000);

          return;
        }

        // =========================
        // OUTROS ERROS
        // =========================

        console.log(
          "Tentando reconectar em 3 segundos..."
        );

        scheduleReconnect(3000);
      }
    }
  );
}

ipcMain.handle("whatsapp:get-groups", async () => {
  if (!sock) {
    throw new Error("WhatsApp não está conectado.");
  }

  const groups = await sock.groupFetchAllParticipating();

  return Object.values(groups).map((group) => ({
    id: group.id,
    title: group.subject,
    participants: group.participants
      .map((participant) => participant.id)
      .filter(Boolean),
  }));
});

ipcMain.handle(
  "whatsapp:export-group-numbers",
  async (_, groupId) => {
    if (!sock) {
      throw new Error(
        "WhatsApp não está conectado."
      );
    }

    const groups =
      await sock.groupFetchAllParticipating();

    const group = groups[groupId];

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    const contacts =
      await Promise.all(
        group.participants.map(
          async (participant) => {
            const id = participant.id;

            if (
              !id ||
              id.endsWith("@g.us")
            ) {
              return null;
            }

            let number = "";

            if (
              id.endsWith("@lid")
            ) {
              const pn =
                await sock.signalRepository?.lidMapping?.getPNForLID(
                  id
                );

              if (pn) {
                number = pn
                  .split("@")[0]
                  .split(":")[0]
                  .replace(/\D/g, "");
              }
            } else {
              number = id
                .split("@")[0]
                .split(":")[0]
                .replace(/\D/g, "");
            }

            return {
              name:
                participant.notify ||
                participant.name ||
                "Nome indisponível",

              number:
                number ||
                "Número indisponível",
            };
          }
        )
      );

    return contacts.filter(Boolean);
  }
);

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
      manualLogout = true;

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
      scheduleReconnect(1000);

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


// app.whenReady().then(
//   function createWindow() {
//     const win = new BrowserWindow(
//       {"width": 800,
//       "height":600}
//     );

//       win.loadFile('../index.html')
//   }
// );
