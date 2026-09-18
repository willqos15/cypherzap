const {
  app,
  BrowserWindow,
  ipcMain,
  Menu
} = require("electron");

const path = require("path");

Menu.setApplicationMenu(null);

const makeWASocket =
  require("@whiskeysockets/baileys").default;

const {
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const QRCode = require("qrcode");
const { env } = require("process");



let mainWindow = null;
let sock = null;
let whatsappStatus = "connecting";
let licencaAtual = null;
let reconnectTimeout = null;
let manualLogout = false;
const contacts = new Map();
const lidToPn = new Map();

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

  //mainWindow.webContents.openDevTools();

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

  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = null;

    if (!sock && !manualLogout) {
      try {
        await connectWhatsApp();
      } catch (error) {
        console.error(
          "Erro ao reconectar WhatsApp:",
          error
        );

        scheduleReconnect(5000);
      }
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



function isValidContactId(id) {
  if (!id) return false;

  if (id.endsWith("@g.us")) return false;
  if (id.endsWith("@broadcast")) return false;

  return true;
}


function isValidPhoneNumber(number) {
  if (!number) {
    return false;
  }

  const digits = number.replace(/\D/g, "");

  return digits.length >= 11 && digits.length <= 14;
}

ipcMain.handle("whatsapp:export-contacts",
  async () => {

    if (!sock) {
      throw new Error(
        "WhatsApp não está conectado."
      );
    }

    const result = [];
    const numbers = new Set();

    for (const contact of contacts.values()) {
      if (!isValidContactId(contact.id)) {
        continue;
      }

      const number = await resolveContactNumber(
        contact.id,
        contact
      );

      if (!isValidPhoneNumber(number)) {
        console.log(
          "NÚMERO INVÁLIDO:",
          contact.id,
          "=>",
          number
        );
        continue;
      }



      if (!number) {
        continue;
      }

      if (numbers.has(number)) {
        continue;
      }

      numbers.add(number);

      result.push({
        name:
          contact.notify ||
          contact.name ||
          contact.verifiedName ||
          "Nome indisponível",

        number
      });
    }

    console.log(
      "IDS ENCONTRADOS:",
      contacts.size
    );

    console.log(
      "NÚMEROS ÚNICOS:",
      result.length
    );

    return result;
  }
);

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

async function enviarContagemContatos() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const numbers = new Set();

  for (const contact of contacts.values()) {
    if (!isValidContactId(contact.id)) {
      continue;
    }

    const number = await resolveContactNumber(
      contact.id,
      contact
    );

    if (!number) {
      continue;
    }

    numbers.add(number);
  }

  mainWindow.webContents.send(
    "whatsapp-contacts-count",
    numbers.size
  );
}


async function resetWhatsAppAuth() {
  console.log("RESETANDO AUTENTICAÇÃO DO WHATSAPP...");

  const currentSock = sock;

  // Impede que o socket antigo interfira no novo fluxo
  sock = null;

  if (currentSock) {
    try {
      currentSock.end(undefined);
    } catch (error) {
      console.log(
        "Erro ao encerrar socket durante reset:",
        error
      );
    }
  }

  whatsappStatus = "disconnected";
  licencaAtual = null;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "whatsapp-status",
      "disconnected"
    );

    mainWindow.webContents.send(
      "whatsapp-qr",
      null
    );

    mainWindow.webContents.send(
      "whatsapp-license",
      null
    );
  }

  const authPath = path.join(
    app.getPath("userData"),
    "auth"
  );

  try {
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, {
        recursive: true,
        force: true,
      });

      console.log("Autenticação removida.");
    }
  } catch (error) {
    console.error(
      "Erro ao remover autenticação:",
      error
    );
  }

  // Dá uma pequena folga antes de criar outro socket
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  if (manualLogout) {
    console.log(
      "Logout manual em andamento. Reset automático cancelado."
    );
    return;
  }

  console.log(
    "Autenticação resetada. Criando nova conexão..."
  );

  scheduleReconnect(0);
}


async function resolveContactNumber(id, contact = null) {
  if (!id) {
    return "";
  }

  // 1. O próprio contato já possui o telefone
  if (contact?.phoneNumber) {
    return contact.phoneNumber
      .split("@")[0]
      .split(":")[0]
      .replace(/\D/g, "");
  }

  // 2. LID -> PN pelo cache do histórico
  if (id.endsWith("@lid")) {
    const pn = lidToPn.get(id);

    if (pn) {
      return pn
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");
    }

    // 3. LID -> PN pelo Baileys
    try {
      const resolvedPn =
        await sock.signalRepository
          ?.lidMapping
          ?.getPNForLID(id);

      if (resolvedPn) {
        lidToPn.set(id, resolvedPn);

        return resolvedPn
          .split("@")[0]
          .split(":")[0]
          .replace(/\D/g, "");
      }
    } catch (error) {
      console.log(
        "Erro ao resolver LID:",
        id,
        error
      );
    }

    return "";
  }

  // 4. Já é um JID normal
  return id
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}


async function connectWhatsApp() {
  console.log("Iniciando Baileys...");

  manualLogout = false;
  const authPath = path.join(
    app.getPath("userData"),
    "auth"
  );

  const { state, saveCreds } =
    await useMultiFileAuthState(authPath);

  const newSock = makeWASocket({
    auth: state,
    syncFullHistory: true,
  });

  sock = newSock;

  newSock.ev.on(
    "creds.update",
    saveCreds
  );

  newSock.ev.on(
    "connection.update",
    (update) => {

      console.log(
        "CONNECTION UPDATE:",
        update
      );

      const statusCode =
        update.lastDisconnect?.error?.output?.statusCode;

      const data =
        update.lastDisconnect?.error?.data;

      console.log("STATUS:", statusCode);
      console.log("DATA:", data);

      if (update.qr) {
        if (sock !== newSock) {
          console.log("QR de socket antigo. Ignorando.");
          return;
        }

        console.log("QR GERADO PELO BAILEYS");

        QRCode.toDataURL(update.qr)
          .then((qrDataUrl) => {
            if (sock !== newSock) {
              console.log(
                "QR convertido de socket antigo. Ignorando."
              );
              return;
            }

            if (
              mainWindow &&
              !mainWindow.isDestroyed()
            ) {
              mainWindow.webContents.send(
                "whatsapp-qr",
                qrDataUrl
              );
            }
          })
          .catch((error) => {
            console.error(
              "Erro ao gerar QR Code:",
              error
            );
          });
      }

      if (update.connection === "open") {

        console.log(
          "WHATSAPP CONECTADO"
        );

        // Só aceita esse socket se ele ainda
        // for o socket atual
        if (sock !== newSock) {
          console.log(
            "Socket antigo abriu. Ignorando."
          );
          return;
        }

        whatsappStatus = "connected";

        if (
          mainWindow &&
          !mainWindow.isDestroyed()
        ) {
          mainWindow.webContents.send(
            "whatsapp-status",
            "connected"
          );
        }

        return;
      }

      if (update.connection === "close") {

        console.log(
          "CONEXÃO FECHADA"
        );

        // Se esse socket não é mais o atual,
        // não mexe no estado do novo socket.
        if (sock !== newSock) {
          console.log(
            "Socket antigo fechado. Ignorando."
          );
          return;
        }

        whatsappStatus = "disconnected";

        if (
          mainWindow &&
          !mainWindow.isDestroyed()
        ) {
          mainWindow.webContents.send(
            "whatsapp-status",
            "disconnected"
          );

          mainWindow.webContents.send(
            "whatsapp-qr",
            null
          );
        }

        if (manualLogout) {

          console.log(
            "Desconexão manual. Não reconectar automaticamente."
          );

          sock = null;

          return;
        }

        if (statusCode === 401) {

          resetWhatsAppAuth().catch((error) => {
            console.error(
              "Erro ao resetar autenticação:",
              error
            );
          });

          return;
        }

        sock = null;

        scheduleReconnect(3000);
      }
    }
  );



 newSock.ev.on(
  "messaging-history.set",
  ({
    chats,
    contacts: historyContacts,
    lidPnMappings,
  }) => {

    if (chats?.length) {
      console.log(
        "EXEMPLO CHAT:",
        chats[0]
      );
    }

    // Guarda os mapeamentos LID -> PN
    for (const mapping of lidPnMappings ?? []) {
      if (!mapping.lid || !mapping.pn) {
        continue;
      }

      lidToPn.set(
        mapping.lid,
        mapping.pn
      );
    }

    console.log(
      "LID -> PN ARMAZENADOS:",
      lidToPn.size
    );

    if (lidPnMappings?.length) {
      console.log(
        "LID MAPPINGS COMPLETO:",
        JSON.stringify(
          lidPnMappings,
          null,
          2
        )
      );
    }

    // Guarda os contatos
    for (const contact of historyContacts ?? []) {
      if (!isValidContactId(contact.id)) {
        continue;
      }

      const existing =
        contacts.get(contact.id) || {};

      contacts.set(contact.id, {
        ...existing,
        ...contact,
      });
    }

    console.log(
      "CONTATOS DO HISTÓRICO:",
      historyContacts?.length ?? 0
    );

    console.log(
      "CONTATOS ARMAZENADOS:",
      contacts.size
    );

    enviarContagemContatos();
  }
);

  newSock.ev.on(
    "chats.upsert",
    (chats) => {



      for (const chat of chats) {

        if (!chat.id) continue;

        // Ignora grupos
        if (chat.id.endsWith("@g.us")) {
          continue;
        }

        // Ignora broadcasts
        if (chat.id.endsWith("@broadcast")) {
          continue;
        }

        const existing =
          contacts.get(chat.id) || {};

        contacts.set(chat.id, {
          ...existing,
          id: chat.id,
          name:
            chat.name ||
            existing.name,
        });
      }



      enviarContagemContatos();
    }
  );

  newSock.ev.on(
    "messages.upsert",
    ({ messages, type }) => {



      for (const message of messages ?? []) {


        const jid = message.key?.remoteJid;

        if (!jid) continue;

        // Ignora grupos
        if (jid.endsWith("@g.us")) {
          continue;
        }

        // Ignora broadcast
        if (jid.endsWith("@broadcast")) {
          continue;
        }

        const existing =
          contacts.get(jid) || {};

        contacts.set(jid, {
          ...existing,
          id: jid,
        });
      }




      enviarContagemContatos();
    }
  );

  newSock.ev.on(
    "contacts.upsert",
    (newContacts) => {


      for (const contact of newContacts) {
        if (!isValidContactId(contact.id)) {
          continue;
        }

        const existing = contacts.get(contact.id) || {};

        contacts.set(contact.id, {
          ...existing,
          ...contact,
        });
      }


      enviarContagemContatos();
    }
  );


  newSock.ev.on(
    "contacts.update",
    (updatedContacts) => {

      console.log(
        "CONTATOS UPDATE:",
        updatedContacts.length
      );

      console.log(
        "CONTATOS UPDATE DETALHADOS:",
        JSON.stringify(
          updatedContacts,
          null,
          2
        )
      );

      for (const contact of updatedContacts) {
        if (!isValidContactId(contact.id)) {
          continue;
        }

        const existing =
          contacts.get(contact.id) || {};

        contacts.set(contact.id, {
          ...existing,
          ...contact,
        });
      }

      console.log(
        "TOTAL DE CONTATOS:",
        contacts.size
      );

      enviarContagemContatos();
    }
  );


}

ipcMain.handle("whatsapp:get-contacts-count",
  async () => {
    if (!sock) {
      throw new Error(
        "WhatsApp não está conectado."
      );
    }

    const numbers = new Set();

    for (const contact of contacts.values()) {
      if (!isValidContactId(contact.id)) {
        continue;
      }

      const number = await resolveContactNumber(
        contact.id,
        contact
      );

      if (!number) {
        continue;
      }

      numbers.add(number);
    }

    return numbers.size;
  }
);

ipcMain.handle("whatsapp:get-groups",
  async () => {
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

ipcMain.handle("whatsapp:export-group-numbers",
  async (_, groupId) => {
    if (!sock) {
      throw new Error("WhatsApp não está conectado.");
    }

    const groups = await sock.groupFetchAllParticipating();
    const group = groups[groupId];

    if (!group) {
      throw new Error("Grupo não encontrado.");
    }

    console.log("GRUPO:", group.subject);
    console.log(
      "TOTAL PARTICIPANTES:",
      group.participants.length
    );

    const contacts = [];
    const unavailableIds = new Set();

    for (const participant of group.participants) {
      const id = participant.id;

      if (!id || id.endsWith("@g.us")) {
        continue;
      }

      let number = "";

      if (id.endsWith("@lid")) {
        try {
          const pn =
            await sock.signalRepository?.lidMapping?.getPNForLID(id);

          console.log(
            "LID:",
            id,
            "=> PN:",
            pn
          );

          if (pn) {
            number = pn
              .split("@")[0]
              .split(":")[0]
              .replace(/\D/g, "");
          }
        } catch (error) {
          console.error(
            "Erro ao resolver LID:",
            id,
            error
          );
        }
      } else {
        number = id
          .split("@")[0]
          .split(":")[0]
          .replace(/\D/g, "");
      }

      const name =
        participant.notify ||
        participant.name ||
        "Nome indisponível";

      // Não conseguiu descobrir o número
      if (!number) {
        unavailableIds.add(id);
        continue;
      }

      contacts.push({
        name,
        number,
      });
    }

    // Adiciona uma única linha no final
    if (unavailableIds.size > 0) {
      contacts.push({
        name: "Números indisponíveis",
        number: unavailableIds.size.toString(),
      });
    }

    return contacts;
  }
);

ipcMain.handle("whatsapp:export-all-group-numbers",
  async () => {
    if (!sock) {
      throw new Error("WhatsApp não está conectado.");
    }

    const groups = await sock.groupFetchAllParticipating();
    const allContacts = [];
    const numbers = new Set();
    const unavailableIds = new Set();

    for (const group of Object.values(groups)) {
      for (const participant of group.participants) {
        const id = participant.id;

        if (!id || id.endsWith("@g.us")) {
          continue;
        }

        let number = "";

        if (id.endsWith("@lid")) {
          try {
            const pn =
              await sock.signalRepository?.lidMapping?.getPNForLID(id);

            if (pn) {
              number = pn
                .split("@")[0]
                .split(":")[0]
                .replace(/\D/g, "");
            }
          } catch (error) {
            console.log("Erro ao resolver LID:", id, error);
          }
        } else {
          number = id
            .split("@")[0]
            .split(":")[0]
            .replace(/\D/g, "");
        }

        // Número indisponível
        if (!number) {
          unavailableIds.add(id);
          continue;
        }

        // Evita duplicar contatos presentes em vários grupos
        if (numbers.has(number)) {
          continue;
        }

        numbers.add(number);

        allContacts.push({
          name:
            participant.notify ||
            participant.name ||
            "Nome indisponível",
          number,
        });
      }
    }

    // Adiciona apenas uma linha com o total de indisponíveis
    if (unavailableIds.size > 0) {
      allContacts.push({
        name: "Números indisponíveis",
        number: unavailableIds.size.toString(),
      });
    }

    return allContacts;
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
      console.log("INICIANDO LOGOUT MANUAL...");

      manualLogout = true;

      const currentSock = sock;

      // Primeiro invalida o socket global
      sock = null;

      if (currentSock) {
        try {
          await currentSock.logout();

          console.log(
            "Logout realizado no WhatsApp."
          );
        } catch (error) {
          console.log(
            "Erro durante logout do socket:",
            error
          );
        }
      }

      whatsappStatus = "disconnected";
      licencaAtual = null;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(
          "whatsapp-status",
          "disconnected"
        );

        mainWindow.webContents.send(
          "whatsapp-qr",
          null
        );

        mainWindow.webContents.send(
          "whatsapp-license",
          null
        );
      }

      const authPath = path.join(
        app.getPath("userData"),
        "auth"
      );

      // Remove a sessão salva
      try {
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, {
            recursive: true,
            force: true,
          });

          console.log(
            "Autenticação removida após logout."
          );
        }
      } catch (error) {
        console.error(
          "Erro ao remover autenticação:",
          error
        );
      }

      // Pequena pausa para garantir que o socket antigo
      // terminou antes de criar o novo.
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      manualLogout = false;

      console.log(
        "LOGOUT CONCLUÍDO. GERANDO NOVO QR..."
      );

      await connectWhatsApp();

      return true;
    } catch (error) {
      console.error(
        "Erro ao desconectar:",
        error
      );

      manualLogout = false;

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
