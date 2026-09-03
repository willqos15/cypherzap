import { useWhatsApp } from "#hooks/useWhatsApp";
import { useEffect, useState } from "react";

import WhatsAppStatus from "./pages/Main/_components/WhatsAppStatus";
import PageMain from "./pages/Main/PageMain";

interface Licenca {
  autorizado: boolean;
  numero: string;
  validade: string | null;
  motivo?: string;
}

function App() {
  const [autorizado, setAutorizado] = useState(false);
  const [licenca, setLicenca] = useState<Licenca | null>(null);
  const [sending, setSending] = useState(false);


useEffect(() => {
  let ativo = true;

  window.whatsapp
    .getLicense()
    .then((license) => {
      if (!ativo) return;

      console.log(
        "LICENÇA RECUPERADA:",
        license
      );

      setLicenca(license);
      setAutorizado(
        license?.autorizado ?? false
      );
    });



  const unsubscribe =
    window.whatsapp.onLicense(
      (license) => {
        console.log(
          "LICENÇA RECEBIDA:",
          license
        );

        if (!ativo) return;

        setLicenca(license);
        setAutorizado(
          license?.autorizado ?? false
        );
      }
    );

  return () => {
    ativo = false;
    unsubscribe?.();
  };
}, []);


  const {
    status,
    qr,
    connected,
    disconnecting,
    desconectar,
  } = useWhatsApp();

  return (
    <>
      {/* DEBUG DA LICENÇA */}
      <div>
        <p>
          Autorizado:{" "}
          {licenca?.autorizado ? "Sim" : "Não"}
        </p>

        <p>
          Número: {licenca?.numero ?? "-"}
        </p>

        <p>
          Validade: {licenca?.validade ?? "-"}
        </p>
        <p>
          Motivo: {licenca?.motivo ?? "-"}
        </p>
      </div>

      <WhatsAppStatus
        status={status}
        qr={qr}
        connected={connected}
        disconnecting={disconnecting}
        sending={sending}
        onDisconnect={desconectar}
        autorizado={autorizado}
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