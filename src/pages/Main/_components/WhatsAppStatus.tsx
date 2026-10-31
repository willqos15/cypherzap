import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../../components/ui/button";


import type { Licenca } from "../../../types/Licensa";
import { useWhatsApp } from "../../../context/WhatsAppContext";
import { LicenseDialog } from "#components/LicenseDialog";

type Props = {
  status: string;
  qr: string | null;
  setAutorizado: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function WhatsAppStatus({
  status,
  qr,
  setAutorizado,
}: Props) {
  const {
    connected,
    disconnecting,
    desconectar,
  } = useWhatsApp();

  const [licenca, setLicenca] = useState<Licenca | null>(null);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);

  useEffect(() => {
    let ativo = true;

    const carregarLicenca = async () => {
      try {
        const license =
          await window.whatsapp.getLicense();

        if (!ativo) return;

        console.log(
          "LICENÇA RECUPERADA:",
          license
        );

        setLicenca(license);

        const expirada =
          !!license?.validade &&
          new Date(license.validade) <= new Date();

        const autorizado =
          license?.autorizado === true &&
          !expirada;

        setAutorizado(autorizado);

        if (!autorizado) {
          setLicenseDialogOpen(true);
        }
      } catch (error) {
        console.error(
          "Erro ao recuperar licença:",
          error
        );

        if (!ativo) return;

        setLicenca(null);
        setAutorizado(false);
        setLicenseDialogOpen(true);
      }
    };

    carregarLicenca();

    const unsubscribe =
      window.whatsapp.onLicense((license) => {
        if (!ativo) return;

        console.log(
          "LICENÇA RECEBIDA:",
          license
        );

        setLicenca(license);

        const expirada =
          !!license?.validade &&
          new Date(license.validade) <= new Date();

        const autorizado =
          license?.autorizado === true &&
          !expirada;

        setAutorizado(autorizado);


      });

    return () => {
      ativo = false;
      unsubscribe?.();
    };
  }, [setAutorizado]);

  console.log(
    "QR NO WHATSAPP STATUS:",
    qr
  );

  console.log(
    "CONNECTED NO WHATSAPP STATUS:",
    connected
  );

  console.log(
    "LICENCA:",
    licenca
  );

  return (
    <div>
      <section className="bg-white border-gray-300 border-b-2 py-4 px-10 flex flex-col mt-5">
        <h1 className="text-2xl font-bold my-2">
          CypherZap 1.0.4 - Automação de WhatsApp
        </h1>

        <div className="flex gap-6 items-center">


          {connected && (
            <>

              <h3>
                {connected && status}
              </h3>

              <Button
                variant="delete"
                onClick={desconectar}
                disabled={disconnecting}
              >
                <LogOut />

                {disconnecting
                  ? "Desconectando..."
                  : "Desconectar"}
              </Button>
            </>
          )}

          <LicenseDialog
            open={licenseDialogOpen}
            onOpenChange={
              setLicenseDialogOpen
            }
          />


        </div>
      </section>

      {!qr && !connected && (
        <p className="flex justify-center p-4">
          Carregando...
        </p>
      )}

      {qr && !connected && (
        <div className="flex flex-col items-center justify-center bg-white p-4 gap-4 mt-5">
          <p className="font-bold">
            Escaneie o QR Code:
          </p>

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