import { LogOut } from "lucide-react";
import { Button } from "../../../components/ui/button";

type Props = {
  status: string;
  qr: string | null;
  connected: boolean;
  disconnecting: boolean;
  sending: boolean;
  autorizado: boolean;
  onDisconnect: () => void;
};

export default function WhatsAppStatus({
  status, qr, connected, disconnecting,
  sending, onDisconnect, autorizado
}: Props) {

 


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
                onClick={onDisconnect}
                disabled={disconnecting || sending}
              >
                <LogOut />
                {disconnecting
                  ? "Desconectando..."
                  : "Desconectar"}
              </Button>


              <p>{autorizado ?
              'Licensa Ativaa' : 'Licensa Desativada'}
              </p>
            </>
          )}



        </div>


      </section>



      {!connected && !qr &&
        <div className="flex justify-center p-4 mt-5">
          <p className="font-bold">Aguarde! Gerando QR Code...</p>
        </div>
      }

      {qr && (
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
