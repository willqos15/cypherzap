import { useEffect, useRef, useState } from "react";



import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";

import PageMain from "./pages/Main/PageMain";

import { useWhatsApp, WhatsAppProvider } from "./context/WhatsAppContext";

import { GroupContactsExtractor } from "./pages/Main/_components/GroupContactsExtractor";

import { Button } from "#components/ui/button";
import ExportContacts from "./pages/Main/_components/ExportContacts";
import SendHistory from "./pages/Main/_components/History/SendHistory";

type Modo = "envio" | "extracao" | "historico";

function AppContent() {
  const [autorizado, setAutorizado] = useState(false);
  const [sending, setSending] = useState(false);
  const [modo, setModo] = useState<Modo>("envio");
  const [historyRefreshKey, setHistoryRefreshKey] =
  useState(0);

const previousSendingRef =
  useRef(sending);

  const {
    status,
    qr,
    connected,
    disconnecting
  } = useWhatsApp();

  useEffect(() => {
    if (sending) {
      setModo("envio");
    }
  }, [sending]);

  useEffect(() => {
  if (
    previousSendingRef.current &&
    !sending
  ) {
    setHistoryRefreshKey(
      (prev) => prev + 1
    );
  }

  previousSendingRef.current = sending;
}, [sending]);


  return (
    <>
      <WhatsAppStatus
        status={status}
        qr={qr}
        sending={sending}
        setAutorizado={setAutorizado}
      />

      <div className={`${(!connected || disconnecting || !autorizado) && "pointer-events-none opacity-50"} flex gap-2 mb-4 mt-2 justify-center`}>

        <Button
          variant={modo === "envio" ? "secondary" : "ghost"}
          type="button"
          onClick={() => setModo("envio")}
        >
          Modo Envio
        </Button>

        <Button
          variant={modo === "extracao" ? "secondary" : "ghost"}
          type="button"
          onClick={() => setModo("extracao")}
          disabled={sending}
        >
          Modo Extração
        </Button>

        <Button
          variant={modo === "historico" ? "secondary" : "ghost"}
          type="button"
          onClick={() => setModo("historico")}
        >
          Histórico de envios
        </Button>
      </div>

      <div className={modo === "envio" ? "block" : "hidden"}>
        <PageMain
          setSending={setSending}
          sending={sending}
          autorizado={autorizado}
        />
      </div>



      <div className={`
  ${(!connected || disconnecting || !autorizado || sending)
          ? "pointer-events-none opacity-50"
          : ""
        }
  ${modo === "extracao" ? "block" : "hidden"}`}>
        <GroupContactsExtractor />
        <ExportContacts />
      </div>

 <div className={`
  ${modo === "historico" ? "block" : "hidden"}`}>
      <SendHistory
          refreshKey={historyRefreshKey}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <WhatsAppProvider>
      <AppContent />
    </WhatsAppProvider>
  );
}

export default App;