import { useEffect, useState } from "react";

export function useWhatsApp() {
const [status, setStatus] =
useState("🟡 Conectando...");

const [qr, setQr] =
useState<string | null>(null);

const [connected, setConnected] =
useState(false);

const [disconnecting, setDisconnecting] =
useState(false);

useEffect(() => {
window.whatsapp.onQR((qrData) => {
setQr(qrData);
});


window.whatsapp.onStatus((value) => {
  if (value === "connected") {
    setConnected(true);
    setStatus("🟢 WhatsApp conectado");
  }

  if (value === "disconnected") {
    setConnected(false);
    setStatus("🔴 WhatsApp desconectado");
  }
});

window.whatsapp
  .getStatus()
  .then((value) => {
    if (value === "connected") {
      setConnected(true);
      setStatus("🟢 WhatsApp conectado");
    }

    if (value === "disconnected") {
      setConnected(false);
      setStatus("🔴 WhatsApp desconectado");
    }
  });


}, []);

async function desconectar() {
try {
setDisconnecting(true);


  await window.whatsapp.desconectar();

  setConnected(false);
  setQr(null);
  setStatus("🔴 WhatsApp desconectado");
} catch (error) {
  console.error(
    "Erro ao desconectar:",
    error
  );
} finally {
  setDisconnecting(false);
}


}

return {
status,
qr,
connected,
disconnecting,
desconectar
};
}
