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