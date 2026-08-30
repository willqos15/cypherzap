type Props = {
status: string;
qr: string | null;
connected: boolean;
disconnecting: boolean;
sending: boolean;
onDisconnect: () => void;
};

export default function WhatsAppStatus({
status,
qr,
connected,
disconnecting,
sending,
onDisconnect
}: Props) {
return (
<> <h3>{status}</h3>


  {qr && (
    <div>
      <p>Escaneie o QR Code:</p>

      <img
        src={qr}
        width={300}
        height={300}
        alt="QR Code"
      />
    </div>
  )}

  {connected && (
    <button
      onClick={onDisconnect}
      disabled={disconnecting || sending}
    >
      {disconnecting
        ? "Desconectando..."
        : "Desconectar WhatsApp"}
    </button>
  )}
</>


);
}
