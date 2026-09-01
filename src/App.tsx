import { useWhatsApp } from "#hooks/useWhatsApp";
import { useState } from "react";

import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";
import PageMain from "./pages/Main/PageMain";

function App() {
  const {
    status,
    qr,
    connected,
    disconnecting,
    desconectar,
  } = useWhatsApp();

  const [sending, setSending] = useState(false);

  return (
    <>
    
          <WhatsAppStatus
            status={status}
            qr={qr}
            connected={connected}
            disconnecting={disconnecting}
            sending={sending}
            onDisconnect={desconectar}
          />
          

      {connected && 
      <PageMain setSending={setSending}/>
      }
      
    </>
  );
}

export default App;