import { useEffect, useState } from "react";



import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";

import PageMain from "./pages/Main/PageMain";

import { useWhatsApp, WhatsAppProvider } from "./context/WhatsAppContext";

import { GroupContactsExtractor } from "./pages/Main/_components/GroupContactsExtractor";

import { Button } from "#components/ui/button";
import ExportContacts from "./pages/Main/_components/ExportContacts";

type Modo = "envio" | "grupos";

function AppContent() {
  const [autorizado, setAutorizado] = useState(false);
  const [sending, setSending] = useState(false);
  const [modo, setModo] = useState<Modo>("envio");

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
          variant={modo === "grupos" ? "secondary" : "ghost"}
          type="button"
          onClick={() => setModo("grupos")}
          disabled={sending}
        >
          Modo Extração
        </Button>
      </div>

      <div className={modo === "envio" ? "block" : "hidden"}>
        <PageMain
          setSending={setSending}
          sending={sending}
          autorizado={autorizado}
        />
      </div>

      <div className={modo === "grupos" ? "block" : "hidden"}>
        <GroupContactsExtractor />
        <ExportContacts/>
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