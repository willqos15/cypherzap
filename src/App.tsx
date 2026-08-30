import { useState, useRef } from "react";

import type { Contact } from "./types/Contact";
import type { ContactStatus } from "./types/Queue";



import WhatsAppStatus from "./components/WhatsAppStatus";

import MessageForm from "./components/MessageForm";
import QueueProgress from "./components/QueueProgress";
import { useWhatsApp } from "./hooks/useWhatsapp";
import ContactList from "./components/Contactlist";

function App() {
const {
status,
qr,
connected,
disconnecting,
desconectar
} = useWhatsApp();

const stopRequested =
useRef(false);

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

const [message, setMessage] =
useState("");

const [intervalSeconds, setIntervalSeconds] =
useState(5);

const [sending, setSending] =
useState(false);

const [contactStatus, setContactStatus] =
useState<ContactStatus>({});

const [currentIndex, setCurrentIndex] =
useState(0);

const [result, setResult] =
useState("");

function toggleContact(id: number) {
setSelectedContacts((current) => {
if (current.includes(id)) {
return current.filter(
(contactId) => contactId !== id
);
}


  return [...current, id];
});


}

function toggleAll() {
if (
selectedContacts.length ===
contacts.length
) {
setSelectedContacts([]);
return;
}


setSelectedContacts(
  contacts.map((contact) => contact.id)
);

}

function pararEnvio() {
stopRequested.current = true;
}

function wait(milliseconds: number) {
return new Promise<void>((resolve) => {
setTimeout(resolve, milliseconds);
});
}

async function enviarFila() {
if (!connected) {
setResult(
"❌ WhatsApp não conectado."
);
return;
}


if (selectedContacts.length === 0) {
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

setSending(true);

stopRequested.current = false;

setResult("");

setCurrentIndex(0);

setContactStatus({});

const queue = contacts.filter(
  (contact) =>
    selectedContacts.includes(contact.id)
);

for (
  let index = 0;
  index < queue.length;
  index++
) {
  if (stopRequested.current) {
    break;
  }

  const contact = queue[index];

  setCurrentIndex(index + 1);

  setContactStatus((current) => ({
    ...current,
    [contact.id]: "sending"
  }));

  try {
    await window.whatsapp.enviarMensagem(
      contact.number,
      message
    );

    setContactStatus((current) => ({
      ...current,
      [contact.id]: "success"
    }));
  } catch (error) {
    console.error(
      `Erro ao enviar para ${contact.name}:`,
      error
    );

    setContactStatus((current) => ({
      ...current,
      [contact.id]: "error"
    }));
  }

  if (
    index < queue.length - 1
  ) {
    await wait(
      intervalSeconds * 1000
    );

    if (stopRequested.current) {
      break;
    }
  }
}

setSending(false);

setResult(
  stopRequested.current
    ? "⏹️ Fila interrompida."
    : "✅ Fila finalizada."
);


}

return (
<main
style={{
maxWidth: 700,
margin: "40px auto",
padding: 20
}}
> <h1>
Disparador WhatsApp </h1>


  <WhatsAppStatus
    status={status}
    qr={qr}
    connected={connected}
    disconnecting={disconnecting}
    sending={sending}
    onDisconnect={desconectar}
  />

  <hr />

  <ContactList
    contacts={contacts}
    selectedContacts={selectedContacts}
    contactStatus={contactStatus}
    sending={sending}
    onToggle={toggleContact}
    onToggleAll={toggleAll}
  />

  <hr />

  <MessageForm
    message={message}
    intervalSeconds={intervalSeconds}
    sending={sending}
    onMessageChange={setMessage}
    onIntervalChange={setIntervalSeconds}
  />

  <QueueProgress
    sending={sending}
    currentIndex={currentIndex}
    total={selectedContacts.length}
    onStop={pararEnvio}
  />

  <button
    type="button"
    onClick={enviarFila}
    disabled={
      sending || !connected
    }
    style={{
      marginTop: 20
    }}
  >
    {sending
      ? "Enviando..."
      : "Enviar selecionados"}
  </button>

  <p>{result}</p>
</main>


);
}

export default App;
