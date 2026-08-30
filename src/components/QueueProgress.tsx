type Props = {
  sending: boolean;
  currentIndex: number;
  total: number;

  estimatedTotalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  estimatedEndTime: Date | null;
  nextSendSeconds: number | null;
  isPaused: boolean;

  formatTime: (
    seconds: number
  ) => string;

  onStop: () => void;
};

export default function QueueProgress({
  sending,
  currentIndex,
  total,
  estimatedTotalSeconds,
  remainingSeconds,
  elapsedSeconds,
  estimatedEndTime,
  nextSendSeconds,
  isPaused,
  formatTime,
  onStop
}: Props) {
  if (total === 0) {
    return null;
  }

  const progress =
    total > 0
      ? (currentIndex / total) *
        100
      : 0;

  const endTime =
    estimatedEndTime
      ? estimatedEndTime.toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }
        )
      : "--:--:--";

  return (
    <section
      style={{
        marginTop: 20,
        padding: 15,
        border: "1px solid #ddd",
        borderRadius: 8
      }}
    >
      <h2>Progresso</h2>

      {!sending ? (
        <>
          <p>
            📊 {total} números na fila
          </p>

          <p>
            ⏱️ Tempo estimado:{" "}
            <strong>
              {formatTime(
                estimatedTotalSeconds
              )}
            </strong>
          </p>

          <p>
            🕐 Término estimado:{" "}
            <strong>
              {endTime}
            </strong>
          </p>
        </>
      ) : (
        <>
          <p>
            Enviando{" "}
            <strong>
              {currentIndex}
            </strong>{" "}
            de{" "}
            <strong>
              {total}
            </strong>
          </p>

          <div
            style={{
              width: "100%",
              height: 10,
              background: "#eee",
              borderRadius: 5,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#25D366",
                transition:
                  "width 0.3s"
              }}
            />
          </div>

          <p>
            ⏱️ Tempo decorrido:{" "}
            <strong>
              {formatTime(
                elapsedSeconds
              )}
            </strong>
          </p>

          <p>
            ⏳ Tempo restante:{" "}
            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>
          </p>

          <p>
            🕐 Término estimado:{" "}
            <strong>
              {endTime}
            </strong>
          </p>

          {isPaused && (
            <p>
              ⏸️ Pausa automática
            </p>
          )}

          {!isPaused &&
            nextSendSeconds !==
              null && (
              <p>
                📤 Próximo envio em{" "}
                <strong>
                  {nextSendSeconds}s
                </strong>
              </p>
            )}

          <button
            type="button"
            onClick={onStop}
          >
            ⏹️ Parar envio
          </button>
        </>
      )}
    </section>
  );
}