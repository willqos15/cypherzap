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


const db = require("../database/database.cjs");


function registrarEnvio({
  listaId,
  numero,
  status,
  mensagem,
  erro = null
}) {
  db.prepare(`
    INSERT INTO historico_envios
    (lista_id, numero, status, mensagem, erro)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    listaId,
    numero,
    status,
    mensagem,
    erro
  );
}

function registrarListaComoPendente({
  listaId,
  numeros,
  mensagens
}) {
  if (!Array.isArray(numeros)) {
    throw new Error("Lista de números inválida.");
  }

  if (!Array.isArray(mensagens)) {
    throw new Error("Lista de mensagens inválida.");
  }

  const stmt = db.prepare(`
    INSERT INTO historico_envios
    (lista_id, numero, status, mensagem, erro)
    VALUES (?, ?, ?, ?, ?)
  `);

  const inserirLista = db.transaction(() => {
    const ids = [];

    for (let i = 0; i < numeros.length; i++) {
      const numero = numeros[i];

      const resultado = stmt.run(
        listaId,
        numero,
        "Espera em fila",
        mensagens[i]?.trim() || null,
        null
      );

      ids.push({
        numero,
        id: resultado.lastInsertRowid
      });
    }

    console.log("REGISTRAR PENDENTES:", {
  listaId,
  numeros,
  mensagens
});

    return ids;
  });

  return inserirLista();
}

function atualizarEnvio({
  id,
  status,
  erro = null
}) {
  const dataHora = new Date().toISOString();

  db.prepare(`
    UPDATE historico_envios
    SET
      status = ?,
      erro = ?,
      data_hora = ?
    WHERE id = ?
  `).run(
    status,
    erro,
    dataHora,
    id
  );

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "historico:envio-atualizado",
      {
        id,
        status,
        erro,
        data_hora: dataHora
      }
    );
  }
}

ipcMain.handle(
  "historico:get-envios",
  async () => {
    try {
      const envios = db
        .prepare(`
          SELECT
            id,
            lista_id,
            numero,
            status,
            data_hora,
            mensagem,
            erro
          FROM historico_envios
          ORDER BY data_hora DESC, id DESC
        `)
        .all();

      return envios;
    } catch (error) {
      console.error(
        "Erro ao buscar histórico de envios:",
        error
      );

      throw new Error(
        "Não foi possível carregar o histórico de envios."
      );
    }
  }
);

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

    phone.length === 8

    //&& phone.startsWith("9")

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

ipcMain.handle("whatsapp:export-contacts", async () => {
  if (!sock) {
    throw new Error("WhatsApp não está conectado.");
  }

  const result = [];
  const numbers = new Set();

  let totalContacts = 0;
  let validContacts = 0;
  let unavailableContacts = 0;

  // =========================================================
  // FUNÇÕES AUXILIARES
  // =========================================================

  function extractNumber(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    return value
      .split("@")[0]
      .split(":")[0]
      .replace(/\D/g, "");
  }

  function isValidNumber(number) {
    if (!number) {
      return false;
    }

    return isValidPhoneNumber(number);
  }

  function isLid(value) {
    return (
      typeof value === "string" &&
      value.endsWith("@lid")
    );
  }

  function isPhoneJid(value) {
    return (
      typeof value === "string" &&
      (
        value.endsWith("@s.whatsapp.net") ||
        value.endsWith("@c.us")
      )
    );
  }

  // =========================================================
  // RESOLVER NÚMERO
  // =========================================================

  async function resolveSavedContactNumber(
    contact
  ) {
    if (!contact) {
      return "";
    }

    // -------------------------------------------------------
    // 1. phoneNumber
    // -------------------------------------------------------

    if (contact.phoneNumber) {
      const number = extractNumber(
        contact.phoneNumber
      );

      if (isValidNumber(number)) {
        return number;
      }
    }

    // -------------------------------------------------------
    // 2. PN / JID / PHONE
    // -------------------------------------------------------

    const possibleValues = [
      contact.pn,
      contact.jid,
      contact.phone,
    ];

    for (const value of possibleValues) {
      const number = extractNumber(value);

      if (isValidNumber(number)) {
        return number;
      }
    }

    // -------------------------------------------------------
    // 3. ID NORMAL
    // -------------------------------------------------------

    if (
      contact.id &&
      !isLid(contact.id)
    ) {
      const number = extractNumber(
        contact.id
      );

      if (isValidNumber(number)) {
        return number;
      }
    }

    // -------------------------------------------------------
    // 4. LID
    // -------------------------------------------------------

    if (
      contact.id &&
      isLid(contact.id)
    ) {
      try {
        const pn =
          await sock.signalRepository
            ?.lidMapping
            ?.getPNForLID(contact.id);

        const number = extractNumber(pn);

        if (isValidNumber(number)) {
          return number;
        }
      } catch (error) {
        console.log(
          "Erro ao resolver LID do contato salvo:",
          contact.id,
          error
        );
      }

      // Pequeno retry
      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      );

      try {
        const pn =
          await sock.signalRepository
            ?.lidMapping
            ?.getPNForLID(contact.id);

        const number = extractNumber(pn);

        if (isValidNumber(number)) {
          return number;
        }
      } catch (error) {
        console.log(
          "Retry LID:",
          contact.id,
          error
        );
      }
    }

    return "";
  }

  // =========================================================
  // CONTATOS
  // =========================================================

  for (const contact of contacts.values()) {
    totalContacts++;

    // -------------------------------------------------------
    // ID
    // -------------------------------------------------------

    if (!contact?.id) {
      continue;
    }

    // -------------------------------------------------------
    // FILTRO DE CONTATO
    // -------------------------------------------------------

    if (!isValidContactId(contact.id)) {
      continue;
    }

    /*
     * Não queremos grupos.
     */
    if (contact.id.endsWith("@g.us")) {
      continue;
    }

    /*
     * Também ignoramos identificadores que não representam
     * contatos individuais.
     */
    if (
      contact.id.endsWith("@broadcast") ||
      contact.id.endsWith("@status")
    ) {
      continue;
    }

    validContacts++;

    // -------------------------------------------------------
    // NÚMERO
    // -------------------------------------------------------

    const number =
      await resolveSavedContactNumber(contact);

    if (!isValidNumber(number)) {
      unavailableContacts++;

      console.log(
        "CONTATO SALVO SEM NÚMERO RESOLVÍVEL:",
        {
          id: contact.id,
          name:
            contact.notify ||
            contact.name ||
            contact.verifiedName ||
            "Nome indisponível",
        }
      );

      continue;
    }

    // -------------------------------------------------------
    // DUPLICADOS
    // -------------------------------------------------------

    if (numbers.has(number)) {
      continue;
    }

    numbers.add(number);

    // -------------------------------------------------------
    // NOME
    // -------------------------------------------------------

    const name =
      contact.notify ||
      contact.name ||
      contact.verifiedName ||
      "Nome indisponível";

    // -------------------------------------------------------
    // ADICIONAR
    // -------------------------------------------------------

    result.push({
      name,
      number,
    });
  }

  // =========================================================
  // LOGS
  // =========================================================

  console.log("----------------------------------------");
  console.log("EXPORTAÇÃO DE CONTATOS SALVOS");
  console.log("----------------------------------------");

  console.log(
    "CONTATOS NA AGENDA:",
    totalContacts
  );

  console.log(
    "CONTATOS VÁLIDOS:",
    validContacts
  );

  console.log(
    "NÚMEROS INDISPONÍVEIS:",
    unavailableContacts
  );

  console.log(
    "NÚMEROS ÚNICOS:",
    result.length
  );

  console.log("----------------------------------------");

  return result;
});

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

function limparContatos() {
  contacts.clear();
  lidToPn.clear();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "whatsapp-contacts-count",
      0
    );
  }

  console.log("CONTATOS E MAPEAMENTOS LIMPOS.");
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
        limparContatos();

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

ipcMain.handle("whatsapp:get-contacts-count", async () => {
  if (!sock) {
    throw new Error("WhatsApp não está conectado.");
  }

  const numbers = new Set();

  for (const contact of contacts.values()) {
    if (!contact?.id) {
      continue;
    }

    // Apenas contatos válidos
    if (!isValidContactId(contact.id)) {
      continue;
    }

    // Ignora grupos
    if (contact.id.endsWith("@g.us")) {
      continue;
    }

    // Ignora status/broadcast
    if (
      contact.id.endsWith("@broadcast") ||
      contact.id.endsWith("@status")
    ) {
      continue;
    }

    const number = await resolveContactNumber(
      contact.id,
      contact
    );

    if (!isValidPhoneNumber(number)) {
      continue;
    }

    numbers.add(number);
  }

  console.log(
    "CONTATOS SALVOS COM NÚMERO:",
    numbers.size
  );

  return numbers.size;
});

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

ipcMain.handle("whatsapp:export-group-numbers", async (_, groupId) => {
  if (!sock) {
    throw new Error("WhatsApp não está conectado.");
  }

  if (!groupId) {
    throw new Error("ID do grupo não informado.");
  }

  // =========================================================
  // CACHE LOCAL
  // =========================================================

  // Mantém os mapeamentos encontrados durante a execução.
  // Isso evita consultar novamente o mesmo LID.
  const lidCache = new Map();

  // =========================================================
  // FUNÇÕES AUXILIARES
  // =========================================================

  function extractNumber(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    /*
     * Exemplos:
     *
     * 5511999999999@s.whatsapp.net
     * 5511999999999:12@s.whatsapp.net
     * 5511999999999
     *
     * Resultado:
     * 5511999999999
     */

    const number = value
      .split("@")[0]
      .split(":")[0]
      .replace(/\D/g, "");

    return number;
  }

  function isValidNumber(number) {
    if (!number) {
      return false;
    }

    /*
     * Evita considerar números absurdamente curtos
     * como números válidos.
     *
     * Brasil normalmente terá pelo menos 10/11 dígitos,
     * mas deixamos 8 como limite mínimo para não prender
     * a função exclusivamente ao Brasil.
     */
    return number.length >= 8;
  }

  function isLid(value) {
    return (
      typeof value === "string" &&
      value.includes("@lid")
    );
  }

  function isPhoneJid(value) {
    return (
      typeof value === "string" &&
      (
        value.includes("@s.whatsapp.net") ||
        value.includes("@c.us")
      )
    );
  }

  // =========================================================
  // BUSCAR METADADOS DO GRUPO
  // =========================================================

  let group;

  try {
    group = await sock.groupMetadata(groupId);
  } catch (error) {
    console.error(
      "Erro ao buscar metadata do grupo:",
      error
    );

    throw new Error(
      "Não foi possível obter os dados do grupo."
    );
  }

  if (!group) {
    throw new Error("Grupo não encontrado.");
  }

  console.log("----------------------------------------");
  console.log("GRUPO:", group.subject);
  console.log("ID:", group.id);
  console.log(
    "TOTAL PARTICIPANTES:",
    group.participants?.length || 0
  );
  console.log(
    "ADDRESSING MODE:",
    group.addressingMode
  );
  console.log("----------------------------------------");

  // =========================================================
  // RESOLVER LID
  // =========================================================

  async function resolveLid(lid) {
    if (!lid) {
      return "";
    }

    // -------------------------------------------------------
    // 1. CACHE
    // -------------------------------------------------------

    if (lidCache.has(lid)) {
      const cached = lidCache.get(lid);

      console.log(
        "LID CACHE:",
        lid,
        "=>",
        cached
      );

      return cached;
    }

    // -------------------------------------------------------
    // 2. getPNForLID
    // -------------------------------------------------------

    try {
      const pn =
        await sock.signalRepository?.lidMapping?.getPNForLID(
          lid
        );

      const number = extractNumber(pn);

      if (isValidNumber(number)) {
        console.log(
          "LID RESOLVIDO PELO MAPPING:",
          lid,
          "=>",
          pn,
          "=>",
          number
        );

        lidCache.set(lid, number);

        return number;
      }
    } catch (error) {
      console.error(
        "getPNForLID falhou:",
        lid,
        error
      );
    }

    // -------------------------------------------------------
    // 3. PEQUENO RETRY
    // -------------------------------------------------------

    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );

    try {
      const pn =
        await sock.signalRepository?.lidMapping?.getPNForLID(
          lid
        );

      const number = extractNumber(pn);

      if (isValidNumber(number)) {
        console.log(
          "LID RESOLVIDO NO RETRY:",
          lid,
          "=>",
          pn,
          "=>",
          number
        );

        lidCache.set(lid, number);

        return number;
      }
    } catch (error) {
      console.error(
        "Retry getPNForLID falhou:",
        lid,
        error
      );
    }

    // -------------------------------------------------------
    // 4. PROCURAR NOS CONTATOS DO SOCKET
    // -------------------------------------------------------

    try {
      const contacts =
        sock.store?.contacts ||
        sock.contacts ||
        {};

      const contact =
        contacts[lid];

      if (contact) {
        const possibleValues = [
          contact.phoneNumber,
          contact.pn,
          contact.jid,
          contact.id,
          contact.phone,
        ];

        for (const value of possibleValues) {
          const number = extractNumber(value);

          if (isValidNumber(number)) {
            console.log(
              "LID RESOLVIDO PELO CONTATO:",
              lid,
              "=>",
              value,
              "=>",
              number
            );

            lidCache.set(lid, number);

            return number;
          }
        }
      }
    } catch (error) {
      console.error(
        "Erro procurando LID nos contatos:",
        error
      );
    }

    // -------------------------------------------------------
    // 5. PROCURAR MAPEAMENTO REVERSO
    // -------------------------------------------------------
    /*
     * Se já tivermos algum PN relacionado, podemos tentar
     * verificar o mapeamento reverso.
     *
     * Aqui não inventamos o PN. Apenas verificamos se a
     * estrutura do mapping está disponível.
     */

    try {
      const mapping =
        sock.signalRepository?.lidMapping;

      if (mapping) {
        console.log(
          "LID sem PN direto:",
          lid
        );

        console.log(
          "Mapping disponível:",
          !!mapping
        );
      }
    } catch (error) {
      console.error(
        "Erro no mapping reverso:",
        error
      );
    }

    // -------------------------------------------------------
    // NÃO FOI POSSÍVEL RESOLVER
    // -------------------------------------------------------

    console.warn(
      "NÃO FOI POSSÍVEL RESOLVER LID:",
      lid
    );

    return "";
  }

  // =========================================================
  // PROCESSAR PARTICIPANTES
  // =========================================================

  const contacts = [];
  const unavailableIds = new Set();

  const participants = Array.isArray(group.participants)
    ? group.participants
    : [];

  for (const participant of participants) {
    const id = participant?.id;

    if (!id) {
      continue;
    }

    // Não deve ocorrer em participantes normais,
    // mas mantemos essa proteção.
    if (id.endsWith("@g.us")) {
      continue;
    }

    console.log("----------------------------------------");
    console.log(
      "PROCESSANDO PARTICIPANTE:",
      id
    );

    console.log(
      "PARTICIPANT:",
      participant
    );

    let number = "";

    // =======================================================
    // TENTATIVA 1 - phoneNumber
    // =======================================================

    if (
      participant.phoneNumber &&
      isPhoneJid(participant.phoneNumber)
    ) {
      number = extractNumber(
        participant.phoneNumber
      );

      console.log(
        "Número encontrado em participant.phoneNumber:",
        number
      );
    }

    // =======================================================
    // TENTATIVA 2 - pn
    // =======================================================

    if (!isValidNumber(number)) {
      const possiblePn = [
        participant.pn,
        participant.phone,
        participant.jid,
      ];

      for (const value of possiblePn) {
        const extracted = extractNumber(value);

        if (isValidNumber(extracted)) {
          number = extracted;

          console.log(
            "Número encontrado em propriedade alternativa:",
            value,
            "=>",
            number
          );

          break;
        }
      }
    }

    // =======================================================
    // TENTATIVA 3 - ID NORMAL
    // =======================================================

    if (
      !isValidNumber(number) &&
      !isLid(id)
    ) {
      const extracted = extractNumber(id);

      if (isValidNumber(extracted)) {
        number = extracted;

        console.log(
          "Número encontrado diretamente no ID:",
          number
        );
      }
    }

    // =======================================================
    // TENTATIVA 4 - RESOLVER LID
    // =======================================================

    if (
      !isValidNumber(number) &&
      isLid(id)
    ) {
      number = await resolveLid(id);
    }

    // =======================================================
    // NOME
    // =======================================================

    const name =
      participant.notify ||
      participant.name ||
      participant.pushName ||
      "Nome indisponível";

    // =======================================================
    // SEM NÚMERO
    // =======================================================

    if (!isValidNumber(number)) {
      console.warn(
        "PARTICIPANTE SEM NÚMERO:",
        {
          id,
          name,
          participant,
        }
      );

      unavailableIds.add(id);

      continue;
    }

    // =======================================================
    // EVITAR DUPLICADOS
    // =======================================================

    const alreadyExists = contacts.some(
      (contact) =>
        contact.number === number
    );

    if (alreadyExists) {
      console.log(
        "Número duplicado ignorado:",
        number
      );

      continue;
    }

    // =======================================================
    // ADICIONAR
    // =======================================================

    contacts.push({
      name,
      number,
    });

    console.log(
      "CONTATO ADICIONADO:",
      {
        name,
        number,
      }
    );
  }

  // =========================================================
  // RESUMO
  // =========================================================

  console.log("----------------------------------------");
  console.log("EXPORTAÇÃO FINALIZADA");
  console.log("----------------------------------------");

  console.log(
    "Total participantes:",
    participants.length
  );

  console.log(
    "Números encontrados:",
    contacts.length
  );

  console.log(
    "Números indisponíveis:",
    unavailableIds.size
  );

  console.log(
    "LIDs resolvidos:",
    lidCache.size
  );

  // =========================================================
  // LINHA DE INDISPONÍVEIS
  // =========================================================

  if (unavailableIds.size > 0) {
    contacts.push({
      name: "Números indisponíveis",
      number: unavailableIds.size.toString(),
    });
  }

  return contacts;
});

ipcMain.handle(
  "whatsapp:export-all-group-numbers",
  async () => {
    if (!sock) {
      throw new Error("WhatsApp não está conectado.");
    }

    // =========================================================
    // CACHE
    // =========================================================

    // LID -> número
    const lidCache = new Map();

    // LIDs que já tentamos resolver e não conseguimos.
    // Evita ficar consultando o mesmo LID dezenas de vezes
    // caso ele apareça em vários grupos.
    const unresolvedLids = new Set();

    // Números já adicionados
    const numbers = new Set();

    // IDs que não conseguimos resolver
    const unavailableIds = new Set();

    const allContacts = [];

    // =========================================================
    // FUNÇÕES AUXILIARES
    // =========================================================

    function extractNumber(value) {
      if (!value || typeof value !== "string") {
        return "";
      }

      return value
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");
    }

    function isValidNumber(number) {
      if (!number) {
        return false;
      }

      // Evita aceitar valores muito curtos
      return number.length >= 8;
    }

    function isLid(value) {
      return (
        typeof value === "string" &&
        value.endsWith("@lid")
      );
    }

    function isPhoneJid(value) {
      return (
        typeof value === "string" &&
        (
          value.includes("@s.whatsapp.net") ||
          value.includes("@c.us")
        )
      );
    }

    // =========================================================
    // RESOLVER LID
    // =========================================================

    async function resolveLid(lid) {
      if (!lid) {
        return "";
      }

      // -------------------------------------------------------
      // CACHE
      // -------------------------------------------------------

      if (lidCache.has(lid)) {
        return lidCache.get(lid);
      }

      // -------------------------------------------------------
      // Já sabemos que não conseguimos resolver
      // -------------------------------------------------------

      if (unresolvedLids.has(lid)) {
        return "";
      }

      // -------------------------------------------------------
      // 1. getPNForLID
      // -------------------------------------------------------

      try {
        const pn =
          await sock.signalRepository?.lidMapping?.getPNForLID(
            lid
          );

        const number = extractNumber(pn);

        if (isValidNumber(number)) {
          console.log(
            "LID RESOLVIDO:",
            lid,
            "=>",
            pn,
            "=>",
            number
          );

          lidCache.set(lid, number);

          return number;
        }
      } catch (error) {
        console.error(
          "Erro em getPNForLID:",
          lid,
          error
        );
      }

      // -------------------------------------------------------
      // 2. RETRY
      // -------------------------------------------------------

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      try {
        const pn =
          await sock.signalRepository?.lidMapping?.getPNForLID(
            lid
          );

        const number = extractNumber(pn);

        if (isValidNumber(number)) {
          console.log(
            "LID RESOLVIDO NO RETRY:",
            lid,
            "=>",
            pn,
            "=>",
            number
          );

          lidCache.set(lid, number);

          return number;
        }
      } catch (error) {
        console.error(
          "Erro no retry do LID:",
          lid,
          error
        );
      }

      // -------------------------------------------------------
      // 3. CONTATOS DO SOCKET
      // -------------------------------------------------------

      try {
        const contacts =
          sock.store?.contacts ||
          sock.contacts ||
          {};

        const contact = contacts[lid];

        if (contact) {
          const possibleValues = [
            contact.phoneNumber,
            contact.pn,
            contact.jid,
            contact.id,
            contact.phone,
          ];

          for (const value of possibleValues) {
            const number = extractNumber(value);

            if (isValidNumber(number)) {
              console.log(
                "LID RESOLVIDO PELO CONTATO:",
                lid,
                "=>",
                value,
                "=>",
                number
              );

              lidCache.set(lid, number);

              return number;
            }
          }
        }
      } catch (error) {
        console.error(
          "Erro procurando LID nos contatos:",
          lid,
          error
        );
      }

      // -------------------------------------------------------
      // NÃO RESOLVIDO
      // -------------------------------------------------------

      unresolvedLids.add(lid);

      console.warn(
        "LID NÃO RESOLVIDO:",
        lid
      );

      return "";
    }

    // =========================================================
    // BUSCAR TODOS OS GRUPOS
    // =========================================================

    let groups;

    try {
      groups =
        await sock.groupFetchAllParticipating();
    } catch (error) {
      console.error(
        "Erro ao buscar grupos:",
        error
      );

      throw new Error(
        "Não foi possível obter os grupos do WhatsApp."
      );
    }

    const groupList = Object.values(groups);

    console.log("----------------------------------------");
    console.log(
      "TOTAL DE GRUPOS:",
      groupList.length
    );
    console.log("----------------------------------------");

    // =========================================================
    // PERCORRER GRUPOS
    // =========================================================

    for (const group of groupList) {
      if (!group?.participants) {
        continue;
      }

      console.log(
        "PROCESSANDO GRUPO:",
        group.subject,
        "| PARTICIPANTES:",
        group.participants.length
      );

      // -------------------------------------------------------
      // PARTICIPANTES
      // -------------------------------------------------------

      for (const participant of group.participants) {
        const id = participant?.id;

        if (!id) {
          continue;
        }

        // Ignora IDs de grupos
        if (id.endsWith("@g.us")) {
          continue;
        }

        let number = "";

        // =====================================================
        // 1. participant.phoneNumber
        // =====================================================

        if (
          participant.phoneNumber &&
          isPhoneJid(participant.phoneNumber)
        ) {
          number = extractNumber(
            participant.phoneNumber
          );

          if (isValidNumber(number)) {
            console.log(
              "NÚMERO ENCONTRADO EM phoneNumber:",
              id,
              "=>",
              number
            );
          }
        }

        // =====================================================
        // 2. OUTRAS PROPRIEDADES
        // =====================================================

        if (!isValidNumber(number)) {
          const possibleValues = [
            participant.pn,
            participant.phone,
            participant.jid,
          ];

          for (const value of possibleValues) {
            const extracted =
              extractNumber(value);

            if (isValidNumber(extracted)) {
              number = extracted;

              console.log(
                "NÚMERO ENCONTRADO EM PROPRIEDADE:",
                id,
                "=>",
                value,
                "=>",
                number
              );

              break;
            }
          }
        }

        // =====================================================
        // 3. ID NORMAL
        // =====================================================

        if (
          !isValidNumber(number) &&
          !isLid(id)
        ) {
          const extracted =
            extractNumber(id);

          if (isValidNumber(extracted)) {
            number = extracted;
          }
        }

        // =====================================================
        // 4. RESOLVER LID
        // =====================================================

        if (
          !isValidNumber(number) &&
          isLid(id)
        ) {
          number = await resolveLid(id);
        }

        // =====================================================
        // NÃO CONSEGUIU
        // =====================================================

        if (!isValidNumber(number)) {
          unavailableIds.add(id);

          continue;
        }

        // =====================================================
        // EVITAR DUPLICADOS
        // =====================================================

        if (numbers.has(number)) {
          continue;
        }

        numbers.add(number);

        // =====================================================
        // NOME
        // =====================================================

        const name =
          participant.notify ||
          participant.name ||
          participant.pushName ||
          "Nome indisponível";

        allContacts.push({
          name,
          number,
        });
      }
    }

    // =========================================================
    // RESUMO
    // =========================================================

    console.log("----------------------------------------");
    console.log("EXPORTAÇÃO DE TODOS OS GRUPOS");
    console.log("----------------------------------------");

    console.log(
      "Grupos:",
      groupList.length
    );

    console.log(
      "Números únicos encontrados:",
      allContacts.length
    );

    console.log(
      "LIDs resolvidos:",
      lidCache.size
    );

    console.log(
      "LIDs não resolvidos:",
      unresolvedLids.size
    );

    console.log(
      "IDs indisponíveis:",
      unavailableIds.size
    );

    console.log("----------------------------------------");

    // =========================================================
    // LINHA DE INDISPONÍVEIS
    // =========================================================

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
  async (_, {
    number,
    message,
    attachment,
    listaId,
    historicoId
  }) => {

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

    const cleanNumber = number.replace(/\D/g, "");

    if (!cleanNumber) {
      throw new Error(
        "Número inválido."
      );
    }

    if (!message?.trim() && !attachment) {
      throw new Error(
        "Mensagem vazia e nenhum anexo."
      );
    }

    try {

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

      } else {

        // =========================
        // CONVERTE ARRAYBUFFER
        // =========================

        const buffer = Buffer.from(
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
                mimetype: attachment.mimetype,
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
                mimetype: attachment.mimetype,
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
                mimetype: attachment.mimetype
              }
            );

            break;

          case "document":

            await sock.sendMessage(
              jid,
              {
                document: buffer,
                mimetype: attachment.mimetype,
                fileName: attachment.fileName,
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
      }

      // =========================
      // REGISTRA SUCESSO
      // =========================

      atualizarEnvio({
  id: historicoId,
  status: "Sucesso",
  erro: null
});

      return true;

    } catch (error) {

      // =========================
      // REGISTRA ERRO
      // =========================

     atualizarEnvio({
  id: historicoId,
  status: "Falha",
  erro: error.message
});

      throw error;
    }
  }
);


ipcMain.handle(
  "historico:registrar-pendentes",
  async (_, { listaId, numeros, mensagens }) => {
    try {
      return registrarListaComoPendente({
        listaId,
        numeros,
        mensagens
      });
    } catch (error) {
      console.error(
        "Erro ao registrar envios pendentes:",
        error
      );

      throw new Error(
        "Não foi possível registrar os envios pendentes."
      );
    }
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
      limparContatos();

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
