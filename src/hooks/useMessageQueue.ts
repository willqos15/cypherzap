import { useRef, useState } from "react";
import type { Contact } from "../types/Contact";
import type { ContactStatus } from "../types/Queue";

type UseMessageQueueProps = {
contacts: Contact[];
selectedContacts: number[];
connected: boolean;
message: string;
intervalSeconds: number;
};

export function useMessageQueue({
contacts,
selectedContacts,
connected,
message,
intervalSeconds
}: UseMessageQueueProps) {
const stopRequested = useRef(false);

const [sending, setSending] =
useState(false);

const [contactStatus, setContactStatus] =
useState<ContactStatus>({});

const [currentIndex, setCurrentIndex] =
useState(0);

const [result, setResult] =
useState("");

function wait(milliseconds: number) {
return new Promise<void>((resolve) => {
setTimeout(resolve, milliseconds);
});
}

function pararEnvio() {
stopRequested.current = true;
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

return {
sending,
contactStatus,
currentIndex,
result,
enviarFila,
pararEnvio
};
}
