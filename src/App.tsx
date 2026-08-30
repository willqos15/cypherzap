import { useState } from "react";

import type { Contact } from "./types/Contact";

import { useWhatsApp } from "./hooks/useWhatsapp";
import { useMessageQueue } from "./hooks/useMessageQueue";

import WhatsAppStatus from "./components/WhatsAppStatus";
import ContactList from "./components/Contactlist";
import MessageForm from "./components/MessageForm";
import QueueProgress from "./components/QueueProgress";

function App() {
// =========================
// WHATSAPP
// =========================

const {
status,
qr,
connected,
disconnecting,
desconectar
} = useWhatsApp();

// =========================
// CONTATOS
// =========================

const [contacts] = useState<Contact[]>([
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

const [intervalSeconds, setIntervalSeconds] =
useState(5);

// =========================
// SELEÇÃO DE CONTATOS
// =========================

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

// =========================
// FILA
// =========================

const queue = useMessageQueue({
contacts,
selectedContacts,
connected,
message,
intervalSeconds
});

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
> <h1>
Disparador WhatsApp </h1>

```
  {/* WHATSAPP */}

  <WhatsAppStatus
    status={status}
    qr={qr}
    connected={connected}
    disconnecting={disconnecting}
    sending={queue.sending}
    onDisconnect={desconectar}
  />

  <hr />

  {/* CONTATOS */}

  <ContactList
    contacts={contacts}
    selectedContacts={selectedContacts}
    contactStatus={queue.contactStatus}
    sending={queue.sending}
    onToggle={toggleContact}
    onToggleAll={toggleAll}
  />

  <hr />

  {/* MENSAGEM */}

  <MessageForm
    message={message}
    intervalSeconds={intervalSeconds}
    sending={queue.sending}
    onMessageChange={setMessage}
    onIntervalChange={setIntervalSeconds}
  />

  {/* PROGRESSO */}

  <QueueProgress
    sending={queue.sending}
    currentIndex={queue.currentIndex}
    total={selectedContacts.length}
    onStop={queue.pararEnvio}
  />

  {/* ENVIAR */}

  <button
    type="button"
    onClick={queue.enviarFila}
    disabled={
      queue.sending || !connected
    }
    style={{
      marginTop: 20
    }}
  >
    {queue.sending
      ? "Enviando..."
      : "Enviar selecionados"}
  </button>

  {/* RESULTADO */}

  <p>{queue.result}</p>
</main>


);
}

export default App;
