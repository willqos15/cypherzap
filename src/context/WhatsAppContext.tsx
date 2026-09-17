import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type WhatsAppContextData = {
  status: string;
  qr: string | null;
  connected: boolean;
  disconnecting: boolean;
  desconectar: () => Promise<void>;
};

const WhatsAppContext = createContext<
  WhatsAppContextData | undefined
>(undefined);

export function WhatsAppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] =
    useState("🟡 Conectando...");

  const [qr, setQr] =
    useState<string | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [disconnecting, setDisconnecting] =
    useState(false);

useEffect(() => {
  console.log("CONTEXT INICIANDO");

  const removeQRListener = window.whatsapp.onQR((qrData) => {
    console.log("QR RECEBIDO NO HOOK:", qrData);
    setQr(qrData);
  });

  console.log("LISTENER QR REGISTRADO");

  const removeStatusListener = window.whatsapp.onStatus((value) => {
    console.log("STATUS RECEBIDO NO HOOK:", value);

    if (value === "connected") {
      setConnected(true);
      setStatus("🟢 Conectado");
      setQr(null);
    }

    if (value === "disconnected") {
      setConnected(false);
      setStatus("🔴 Desconectado");
      setQr(null);
    }
  });

  console.log("LISTENER STATUS REGISTRADO");

  window.whatsapp.getStatus().then((value) => {
    console.log("STATUS INICIAL:", value);

    if (value === "connected") {
      setConnected(true);
      setStatus("🟢 Conectado");
    }

    if (value === "disconnected") {
      setConnected(false);
      setStatus("🔴 Desconectado");
    }
  });

  return () => {
    console.log("CONTEXT DESMONTANDO");

    removeQRListener();
    removeStatusListener();
  };
}, []);

 async function desconectar() {
  try {
    setDisconnecting(true);
    await window.whatsapp.desconectar();
  } catch (error) {
    console.error("Erro ao desconectar:", error);
  } finally {
    setDisconnecting(false);
    
  }
}

  return (
    <WhatsAppContext.Provider
      value={{
        status,
        qr,
        connected,
        disconnecting,
        desconectar,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);

  if (!context) {
    throw new Error(
      "useWhatsApp deve ser usado dentro do WhatsAppProvider"
    );
  }

  return context;
}