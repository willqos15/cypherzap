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
    setStatus("🟢 Conectado");
  }

  if (value === "disconnected") {
    setConnected(false);
    setStatus("🔴 Desconectado");
  }
});

window.whatsapp
  .getStatus()
  .then((value) => {
    if (value === "connected") {
      setConnected(true);
      setStatus("🟢 Conectado");
    }

    if (value === "disconnected") {
      setConnected(false);
      setStatus("🔴 Desconectado");
    }
  });


}, []);

async function desconectar() {
try {
setDisconnecting(true);


  await window.whatsapp.desconectar();

  setConnected(false);
  setQr(null);
  setStatus("🔴 Desconectado");
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
