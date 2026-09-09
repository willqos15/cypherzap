import { useWhatsApp } from "#hooks/useWhatsApp";
import { useState } from "react";

import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";
import PageMain from "./pages/Main/PageMain";
import { WhatsAppProvider } from "./context/WhatsAppContext";


function App() {
  const [autorizado, setAutorizado] = useState(false);

  const [sending, setSending] = useState(false);

  const {
    status,
    qr,
  } = useWhatsApp();

  return (
    <WhatsAppProvider>

      <WhatsAppStatus
        status={status}
        qr={qr}
        sending={sending}
        setAutorizado={setAutorizado}
      />

      <div>
        <PageMain
          setSending={setSending}
          autorizado={autorizado}
        />
      </div>
    
    </WhatsAppProvider>
  );
}

export default App;