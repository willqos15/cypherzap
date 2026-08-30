type Props = {
  message: string;

  minIntervalSeconds: number;
  maxIntervalSeconds: number;

  pauseEvery: number;
  pauseDurationSeconds: number;

  sending: boolean;

  onMessageChange: (
    value: string
  ) => void;

  onMinIntervalChange: (
    value: number
  ) => void;

  onMaxIntervalChange: (
    value: number
  ) => void;

  onPauseEveryChange: (
    value: number
  ) => void;

  onPauseDurationChange: (
    value: number
  ) => void;
};

export default function MessageForm({
  message,

  minIntervalSeconds,
  maxIntervalSeconds,

  pauseEvery,
  pauseDurationSeconds,

  sending,

  onMessageChange,
  onMinIntervalChange,
  onMaxIntervalChange,
  onPauseEveryChange,
  onPauseDurationChange
}: Props) {
  return (
    <section>
      <h2>Mensagem</h2>

      <textarea
        value={message}
        onChange={(event) =>
          onMessageChange(
            event.target.value
          )
        }
        placeholder="Digite sua mensagem..."
        rows={5}
        disabled={sending}
        style={{
          width: "100%",
          resize: "vertical"
        }}
      />

      <h3>
        Intervalo entre mensagens
      </h3>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center"
        }}
      >
        <label>
          Mínimo:
        </label>

        <input
          type="number"
          min="0"
          value={minIntervalSeconds}
          onChange={(event) =>
            onMinIntervalChange(
              Number(event.target.value)
            )
          }
          disabled={sending}
          style={{
            width: 70
          }}
        />

        <span>segundos</span>

        <label>
          Máximo:
        </label>

        <input
          type="number"
          min="0"
          value={maxIntervalSeconds}
          onChange={(event) =>
            onMaxIntervalChange(
              Number(event.target.value)
            )
          }
          disabled={sending}
          style={{
            width: 70
          }}
        />

        <span>segundos</span>
      </div>

      <h3>
        Pausa automática
      </h3>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <label>
          Pausar a cada
        </label>

        <input
          type="number"
          min="1"
          value={pauseEvery}
          onChange={(event) =>
            onPauseEveryChange(
              Number(event.target.value)
            )
          }
          disabled={sending}
          style={{
            width: 70
          }}
        />

        <span>envios</span>

        <label>
          durante
        </label>

        <input
          type="number"
          min="0"
          value={pauseDurationSeconds}
          onChange={(event) =>
            onPauseDurationChange(
              Number(event.target.value)
            )
          }
          disabled={sending}
          style={{
            width: 70
          }}
        />

        <span>segundos</span>
      </div>
    </section>
  );
}