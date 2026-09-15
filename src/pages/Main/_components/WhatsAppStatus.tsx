import { LogOut } from "lucide-react";
import { Button } from "../../../components/ui/button";
import LicenseDialog from "#components/LicenseDialog";
import { useEffect, useState } from "react";
import type { Licenca } from "../../../types/Licensa";
import { useWhatsApp } from "../../../context/WhatsAppContext";


type Props = {
  status: string;
  qr: string | null;
  sending: boolean;
  setAutorizado: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function WhatsAppStatus({
  status, qr,
  sending, setAutorizado
}: Props) {

  const {
      connected,
      disconnecting,desconectar,
    } = useWhatsApp();

    const [licenca, setLicenca] = useState<Licenca | null>(null);

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

 


  return (
    <div>

      <section className="bg-white border-gray-300 border-b-2 py-4  px-10 flex flex-col mt-5">
        <h1 className="text-2xl font-bold my-2">
          CypherZap - Automação de WhatsApp
        </h1>

        <div className="flex gap-6 items-center">

          <h3>{connected && status}</h3>

          {connected && (
            <>
              <Button
                variant="delete"
                onClick={desconectar}
                disabled={disconnecting || sending}
              >
                <LogOut />
                {disconnecting
                  ? "Desconectando..."
                  : "Desconectar"}
              </Button>


              <LicenseDialog licenca={licenca}
               onLicenseUpdate={(license) => {
    setLicenca(license);
    setAutorizado(license?.autorizado ?? false);
  }}/>
            </>
          )}



        </div>


      </section>

      {!qr && !connected && <p className="flex justify-center p-4">
        Carregando... </p>}

    

      {qr && !connected &&  (
        <div className="flex flex-col items-center justify-center bg-white p-4 gap-4 mt-5">
          <p className="font-bold">Escaneie o QR Code:</p>

          <img
            src={qr}
            width={300}
            height={300}
            alt="QR Code"
          />
        </div>
      )}


    </div>


  );
}
