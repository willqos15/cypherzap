import { useState } from "react";

import { useWhatsApp } from "./hooks/useWhatsapp";
import { useMessageQueue } from "./hooks/useMessageQueue";

import WhatsAppStatus from "./components/WhatsAppStatus";
import MessageForm from "./components/MessageForm";
import QueueProgress from "./components/QueueProgress";
import ExcelImport from "./components/ExcelImport";
import NumberInput from "./components/NumberInput";

function App() {
  // =========================
  // WHATSAPP
  // =========================

  const {
    status,
    qr,
    connected,
    disconnecting,
    desconectar
  } = useWhatsApp();

  // =========================
  // NÚMEROS
  // =========================

  const [numbers, setNumbers] = useState<string[]>([]);

  // =========================
  // MENSAGEM
  // =========================

  const [message, setMessage] = useState("");

  const [
    minIntervalSeconds,
    setMinIntervalSeconds
  ] = useState(3);

  const [
    maxIntervalSeconds,
    setMaxIntervalSeconds
  ] = useState(8);

  const [
    pauseEvery,
    setPauseEvery
  ] = useState(10);

  const [
    pauseDurationSeconds,
    setPauseDurationSeconds
  ] = useState(60);

  // =========================
  // FILA
  // =========================

  const queue = useMessageQueue({
    numbers,
    connected,
    message,
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds
  });

  // =========================
  // RENDER
  // =========================

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20
      }}
    >
      <h1>
        Disparador WhatsApp
      </h1>

      {/* WHATSAPP */}

      <WhatsAppStatus
        status={status}
        qr={qr}
        connected={connected}
        disconnecting={disconnecting}
        sending={queue.sending}
        onDisconnect={desconectar}
      />

      <hr />

      {/* IMPORTAR EXCEL / CSV */}

      <ExcelImport
        numbers={numbers}
        onNumbersChange={setNumbers}
      />

      <br />

      {/* NÚMEROS */}

      <NumberInput
        numbers={numbers}
        disabled={queue.sending}
        onNumbersChange={setNumbers}
      />

      <hr />

      {/* MENSAGEM */}

      <MessageForm
        message={message}
        minIntervalSeconds={minIntervalSeconds}
        maxIntervalSeconds={maxIntervalSeconds}
        pauseEvery={pauseEvery}
        pauseDurationSeconds={pauseDurationSeconds}
        sending={queue.sending}
        onMessageChange={setMessage}
        onMinIntervalChange={
          setMinIntervalSeconds
        }
        onMaxIntervalChange={
          setMaxIntervalSeconds
        }
        onPauseEveryChange={
          setPauseEvery
        }
        onPauseDurationChange={
          setPauseDurationSeconds
        }
      />

      {/* PROGRESSO */}

      <QueueProgress
        sending={queue.sending}
        currentIndex={queue.currentIndex}
        total={numbers.length}
        estimatedTotalSeconds={
          queue.estimatedTotalSeconds
        }
        remainingSeconds={
          queue.remainingSeconds
        }
        elapsedSeconds={
          queue.elapsedSeconds
        }
        estimatedEndTime={
          queue.estimatedEndTime
        }
        nextSendSeconds={
          queue.nextSendSeconds
        }
        isPaused={queue.isPaused}
        formatTime={queue.formatTime}
        onStop={queue.pararEnvio}
      />

      {/* ENVIAR */}

      <button
        type="button"
        onClick={queue.enviarFila}
        disabled={
          queue.sending ||
          !connected ||
          numbers.length === 0
        }
        style={{
          marginTop: 20
        }}
      >
        {queue.sending
          ? "Enviando..."
          : "Enviar números"}
      </button>

      {/* RESULTADO */}

      <p>
        {queue.result}
      </p>
    </main>
  );
}

export default App;