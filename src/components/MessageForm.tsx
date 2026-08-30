type Props = {
message: string;
intervalSeconds: number;
sending: boolean;
onMessageChange: (value: string) => void;
onIntervalChange: (value: number) => void;
};

export default function MessageForm({
message,
intervalSeconds,
sending,
onMessageChange,
onIntervalChange
}: Props) {
return ( <section> <h2>Mensagem</h2>


  <textarea
    value={message}
    onChange={(event) =>
      onMessageChange(event.target.value)
    }
    placeholder="Digite sua mensagem..."
    rows={5}
    disabled={sending}
    style={{
      width: "100%",
      resize: "vertical"
    }}
  />

  <div style={{ marginTop: 15 }}>
    <label>
      Intervalo entre mensagens:
    </label>

    <input
      type="number"
      min="0"
      value={intervalSeconds}
      onChange={(event) =>
        onIntervalChange(
          Number(event.target.value)
        )
      }
      disabled={sending}
      style={{
        marginLeft: 10,
        width: 70
      }}
    />

    <span> segundos</span>
  </div>
</section>


);
}
