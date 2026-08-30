import {
  useEffect,
  useState
} from "react";

import type { Contact } from "./types/Contact";

type SendStatus =
  | "waiting"
  | "sending"
  | "success"
  | "error";

type ContactStatus = {
  [id: number]: SendStatus;
};

function App() {

  // =========================
  // WHATSAPP
  // =========================

  const [status, setStatus] =
    useState("🟡 Conectando...");

  const [qr, setQr] =
    useState<string | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [disconnecting, setDisconnecting] =
    useState(false);


  // =========================
  // CONTATOS
  // =========================

  const [contacts] =
    useState<Contact[]>([
      {
        id: 1,
        name: "Aline",
        number: "5593992216545"
      },
      {
        id: 2,
        name: "Gabriel",
        number: "5521959240257"
      },
      {
        id: 3,
        name: "Brenno",
        number: "5593991902915"
      }
    ]);

  const [selectedContacts, setSelectedContacts] =
    useState<number[]>([]);


  // =========================
  // MENSAGEM
  // =========================

  const [message, setMessage] =
    useState("");


  // =========================
  // FILA
  // =========================

  const [intervalSeconds, setIntervalSeconds] =
    useState(5);

  const [sending, setSending] =
    useState(false);

  const [contactStatus, setContactStatus] =
    useState<ContactStatus>({});

  const [currentIndex, setCurrentIndex] =
    useState(0);


  // =========================
  // RESULTADO
  // =========================

  const [result, setResult] =
    useState("");


  // =========================
  // WHATSAPP EVENTS
  // =========================

 useEffect(() => {

  window.whatsapp.onQR(
    (qrData) => {
      console.log(
        "REACT QR:",
        !!qrData
      );

      setQr(qrData);
    }
  );


  window.whatsapp.onStatus(
    (value) => {

      console.log(
        "REACT STATUS:",
        value
      );

      if (value === "connected") {

        setConnected(true);

        setStatus(
          "🟢 WhatsApp conectado"
        );
      }

      if (value === "disconnected") {

        setConnected(false);

        setStatus(
          "🔴 WhatsApp desconectado"
        );
      }

    }
  );


  // Recupera o estado atual
  // caso o evento já tenha acontecido

  window.whatsapp
    .getStatus()
    .then((value) => {

      console.log(
        "STATUS ATUAL:",
        value
      );

      if (value === "connected") {

        setConnected(true);

        setStatus(
          "🟢 WhatsApp conectado"
        );
      }

      if (value === "disconnected") {

        setConnected(false);

        setStatus(
          "🔴 WhatsApp desconectado"
        );
      }

    });

}, []);


  // =========================
  // DESCONNECTAR
  // =========================

  async function desconectar() {

    try {

      setDisconnecting(true);

      await window.whatsapp.desconectar();

      setConnected(false);

      setQr(null);

      setStatus(
        "🔴 WhatsApp desconectado"
      );

    } catch (error) {

      console.error(
        "Erro ao desconectar:",
        error
      );

    } finally {

      setDisconnecting(false);

    }

  }


  // =========================
  // SELECIONAR CONTATO
  // =========================

  function toggleContact(id: number) {

    setSelectedContacts((current) => {

      if (current.includes(id)) {

        return current.filter(
          (contactId) =>
            contactId !== id
        );

      }

      return [
        ...current,
        id
      ];

    });

  }


  // =========================
  // SELECIONAR TODOS
  // =========================

  function toggleAll() {

    if (
      selectedContacts.length ===
      contacts.length
    ) {

      setSelectedContacts([]);

      return;
    }

    setSelectedContacts(
      contacts.map(
        (contact) => contact.id
      )
    );

  }


  // =========================
  // ESPERA
  // =========================

  function wait(
    milliseconds: number
  ) {

    return new Promise<void>(
      (resolve) => {

        setTimeout(
          resolve,
          milliseconds
        );

      }
    );

  }


  // =========================
  // ENVIAR FILA
  // =========================

  async function enviarFila() {

    if (!connected) {

      setResult(
        "❌ WhatsApp não conectado."
      );

      return;

    }

    if (
      selectedContacts.length === 0
    ) {

      setResult(
        "❌ Selecione pelo menos um contato."
      );

      return;

    }

    if (!message.trim()) {

      setResult(
        "❌ Digite uma mensagem."
      );

      return;

    }

    if (intervalSeconds < 0) {

      setResult(
        "❌ Intervalo inválido."
      );

      return;

    }


    // =========================
    // INICIA FILA
    // =========================

    setSending(true);

    setResult("");

    setCurrentIndex(0);

    setContactStatus({});


    const queue = contacts.filter(
      (contact) =>
        selectedContacts.includes(
          contact.id
        )
    );


    // =========================
    // PROCESSA FILA
    // =========================

    for (
      let index = 0;
      index < queue.length;
      index++
    ) {

      const contact =
        queue[index];


      setCurrentIndex(
        index + 1
      );


      setContactStatus(
        (current) => ({
          ...current,
          [contact.id]: "sending"
        })
      );


      try {

        await window.whatsapp.enviarMensagem(
          contact.number,
          message
        );


        setContactStatus(
          (current) => ({
            ...current,
            [contact.id]: "success"
          })
        );


      } catch (error) {

        console.error(
          `Erro ao enviar para ${contact.name}:`,
          error
        );


        setContactStatus(
          (current) => ({
            ...current,
            [contact.id]: "error"
          })
        );

      }


      // =========================
      // INTERVALO
      // =========================

      if (
        index <
        queue.length - 1
      ) {

        await wait(
          intervalSeconds * 1000
        );

      }

    }


    setSending(false);

    setResult(
      "✅ Fila finalizada."
    );

  }


  // =========================
  // RENDER
  // =========================

  return (

    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20
      }}
    >

      <h1>
        Disparador WhatsApp
      </h1>


      {/* STATUS */}

      <h3>
        {status}
      </h3>


      {/* QR */}

      {qr && (

        <div>

          <p>
            Escaneie o QR Code:
          </p>

          <img
            src={qr}
            width={300}
            height={300}
            alt="QR Code"
          />

        </div>

      )}


      {/* DESCONCTAR */}

      {connected && (

        <button
          onClick={desconectar}
          disabled={
            disconnecting ||
            sending
          }
        >
          {disconnecting
            ? "Desconectando..."
            : "Desconectar WhatsApp"}
        </button>

      )}


      <hr />


      {/* CONTATOS */}

      <h2>
        Contatos
      </h2>


      <button
        type="button"
        onClick={toggleAll}
        disabled={sending}
      >
        {selectedContacts.length ===
        contacts.length
          ? "Desmarcar todos"
          : "Selecionar todos"}
      </button>


      <div
        style={{
          marginTop: 15
        }}
      >

        {contacts.map(
          (contact) => {

            const selected =
              selectedContacts.includes(
                contact.id
              );

            const contactState =
              contactStatus[
                contact.id
              ];


            return (

              <div
                key={contact.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0"
                }}
              >

                <input
                  type="checkbox"
                  checked={selected}
                  disabled={sending}
                  onChange={() =>
                    toggleContact(
                      contact.id
                    )
                  }
                />


                <span>
                  {contact.name}
                </span>


                <span>
                  {contact.number}
                </span>


                {contactState ===
                  "sending" && (
                  <span>
                    ⏳
                  </span>
                )}


                {contactState ===
                  "success" && (
                  <span>
                    ✅
                  </span>
                )}


                {contactState ===
                  "error" && (
                  <span>
                    ❌
                  </span>
                )}

              </div>

            );

          }
        )}

      </div>


      <hr />


      {/* MENSAGEM */}

      <h2>
        Mensagem
      </h2>


      <textarea
        value={message}
        onChange={(event) =>
          setMessage(
            event.target.value
          )
        }
        placeholder="Digite sua mensagem..."
        rows={5}
        style={{
          width: "100%",
          resize: "vertical"
        }}
        disabled={sending}
      />


      {/* INTERVALO */}

      <div
        style={{
          marginTop: 15
        }}
      >

        <label>
          Intervalo entre mensagens:
        </label>


        <input
          type="number"
          min="0"
          value={intervalSeconds}
          onChange={(event) =>
            setIntervalSeconds(
              Number(
                event.target.value
              )
            )
          }
          disabled={sending}
          style={{
            marginLeft: 10,
            width: 70
          }}
        />


        <span>
          {" "}segundos
        </span>

      </div>


      {/* PROGRESSO */}

      {sending && (

        <p>

          Enviando{" "}
          {currentIndex}{" "}
          de{" "}
          {selectedContacts.length}

        </p>

      )}


      {/* BOTÃO */}

      <button
        type="button"
        onClick={enviarFila}
        disabled={
          sending ||
          !connected
        }
        style={{
          marginTop: 20
        }}
      >

        {sending
          ? "Enviando..."
          : "Enviar selecionadoss"}

      </button>


      {/* RESULTADO */}

      <p>
        {result}
      </p>

    </main>

  );

}

export default App;