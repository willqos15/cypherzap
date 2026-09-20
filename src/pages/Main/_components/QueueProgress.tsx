import { Pause, Play } from "lucide-react";

import type { SendResult } from "../../../types/sendResult";

import ExportReportButton from "./ExportReportButton";

import { Button } from "../../../components/ui/button";

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
  sendResults: SendResult[];
  formatTime: (seconds: number) => string;
  onStop: () => void;
  continuarEnvio: () => void;
  numbers: string[]
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
  onStop,
  sendResults,
  continuarEnvio,
  numbers
}: Props) {

  

  if (total === 0) {
    return null;
  }

  // Quantidade de mensagens já processadas.
  const processed = Math.min(
    Math.max(currentIndex, 0),
    total
  );

  // Progresso GERAL da fila.
  const progress = Math.round(
    (processed / total) * 100
  );

  const endTime = estimatedEndTime
    ? estimatedEndTime.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "--:--:--";

  const successCount = sendResults.filter(
    (item) => item.status === "success"
  ).length;

  const failedCount = sendResults.filter(
    (item) => item.status === "failed"
  ).length;

  return (
    <section className="mt-5 rounded-lg border border-gray-300 p-3.75">

      <h2 className="mb-3 text-xl font-semibold">
        Progresso
      </h2>

      {/* Barra geral da fila */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-sm">
          <span>
            {processed} de {total} mensagens
          </span>

          <strong>{progress}%</strong>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-full overflow-hidden rounded-[5px] bg-gray-200">
            <div
              className="h-full rounded-[5px] bg-green-600 transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {sending && !isPaused && (
            <Button
              variant="secondary"
              onClick={onStop}
              className="font-bold"
            >
              <Pause />
            </Button>
          )}

          {sending && isPaused && (
            <Button
              variant="secondary"
              onClick={continuarEnvio}
              className="font-bold"
            >
              <Play />
            </Button>
          )}



        </div>
      </div>




      {!sending ? (
        <>
          <p>
            📊 {total} números na fila
          </p>

          <p>
            ⏱️ Tempo estimado:{" "}
            <strong>
              {formatTime(estimatedTotalSeconds)}
            </strong>
          </p>



          {sendResults.length > 0 && numbers.length>0 && (
            <>
              <p>
                ✅{" "}
                <strong>{successCount}</strong>{" "}
                enviados com sucesso
              </p>

              <p>
                ❌{" "}
                <strong>{failedCount}</strong>{" "}
                falharam
              </p>


            </>
          )}
        </>
      ) : (
        <>
          <p>
            Enviando{" "}
            <strong>{processed}</strong> de{" "}
            <strong>{total}</strong>
          </p>

          <p>
            ⏱️ Tempo estimado:{" "}
            <strong>
              {formatTime(estimatedTotalSeconds)}
            </strong>
          </p>

          <p>
            ⏱️ Tempo decorrido:{" "}
            <strong>
              {formatTime(elapsedSeconds)}
            </strong>
          </p>

          <p>
            ⏳ Tempo restante:{" "}
            <strong>
              {formatTime(remainingSeconds)}
            </strong>
          </p>

          <p>
            🕐 Término estimado:{" "}
            <strong>{endTime}</strong>
          </p>



          {isPaused && (
            <p>
              ⏸️ Pausa automática — próximo envio em{" "}
              <strong>
                {nextSendSeconds !== null
                  ? formatTime(nextSendSeconds)
                  : "--"}
              </strong>
            </p>
          )}




          {!isPaused && nextSendSeconds !== null && (
            <p>
              📤 Próximo envio em{" "}
              <strong>
                {formatTime(nextSendSeconds)}
              </strong>
            </p>
          )}

        </>
      )}

      {sendResults.length > 0 && (isPaused || !sending) &&
        <ExportReportButton results={sendResults} numbers={numbers} className='mt-2 w-full' />
      }
    </section>
  );
}