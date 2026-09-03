import { useWhatsApp } from "#hooks/useWhatsApp";
import { useState } from "react";

import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";
import PageMain from "./pages/Main/PageMain";


function App() {
  const [autorizado, setAutorizado] = useState(false);

  const [sending, setSending] = useState(false);

  const {
    status,
    qr,
    connected,
    disconnecting,
    desconectar,
  } = useWhatsApp();

  return (
    <>

      <WhatsAppStatus
        status={status}
        qr={qr}
        connected={connected}
        disconnecting={disconnecting}
        sending={sending}
        onDisconnect={desconectar}
        setAutorizado={setAutorizado}
      />

      <div>
        <PageMain
          setSending={setSending}
          autorizado={autorizado}
        />
      </div>
    </>
  );
}

export default App;