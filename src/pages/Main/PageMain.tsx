import { useEffect, useState } from "react";

import { useWhatsApp } from "../../hooks/useWhatsApp";
import { useMessageQueue } from "../../hooks/useMessageQueue";


import QueueProgress from "./_components/QueueProgress";
import NumberInput from "./_components/NumberPhone/NumberInput";
import MessageComposer from "./_components/Message/MessageComposer";

import type { MessageModel } from "../../types/MessageModel";
import ExcelImportNumber from "./_components/NumberPhone/ExcelImportNumber";

import { Toaster } from "sonner";
import { SendSettings } from "./_components/SendSettings";
import { Send } from "lucide-react";
import { Button } from "#components/ui/button";

interface InterfacePageMain {
  setSending: React.Dispatch<React.SetStateAction<boolean>>;
}
export default function PageMain({setSending}:InterfacePageMain) {
  // =========================
  // WHATSAPP
  // =========================

  

  const {
    connected,
    disconnecting,
  } = useWhatsApp();

  // =========================
  // NÚMEROS
  // =========================

  const [numbers, setNumbers] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // =========================
  // MODELOS DE MENSAGEM
  // =========================

  const [models, setModels] = useState<MessageModel[]>(
    []
  );

  const [selectedModelId, setSelectedModelId] =
    useState<string | null>(null);

  // =========================
  // INTERVALOS
  // =========================

  const [
    minIntervalSeconds,
    setMinIntervalSeconds,
  ] = useState(3);

  const [
    maxIntervalSeconds,
    setMaxIntervalSeconds,
  ] = useState(8);

  // =========================
  // PAUSA AUTOMÁTICA
  // =========================

  const [
    pauseEvery,
    setPauseEvery,
  ] = useState(10);

  const [
    pauseDurationSeconds,
    setPauseDurationSeconds,
  ] = useState(60);

  // =========================
  // FILA DE ENVIO
  // =========================

  const queue = useMessageQueue({
    numbers,
    connected,
    models,
    selectedModelId,
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds,
    message
  });

  useEffect(() => {
  setSending(queue.sending);
}, [queue.sending, setSending, disconnecting]);

  const styleSection = "bg-white border-gray-300 border-2 rounded-lg p-4 flex flex-col gap-4 mt-5"

  return (
    <>

    <Toaster />
    <main className="w-full my-10 mx-auto px-10"
    >

   
      <section className={`${styleSection}`}>

       

      <ExcelImportNumber
        numbers={numbers}
        onNumbersChange={setNumbers}
      />

      <NumberInput
        numbers={numbers}
        disabled={queue.sending}
        onNumbersChange={setNumbers}
      />


      </section>

      <section className={`${styleSection}`}>

      <MessageComposer
        models={models}
        message={message}
        setMessage={setMessage}
        selectedModelId={selectedModelId}
        sending={queue.sending}
        onModelsChange={setModels}
        onModelSelect={setSelectedModelId}
      />

      </section>

      
    <section className={`${styleSection}`}>
      <SendSettings
  minIntervalSeconds={minIntervalSeconds}
  maxIntervalSeconds={maxIntervalSeconds}
  pauseEvery={pauseEvery}
  pauseDurationSeconds={pauseDurationSeconds}
  sending={queue.sending}
  setMinIntervalSeconds={setMinIntervalSeconds}
  setMaxIntervalSeconds={setMaxIntervalSeconds}
  setPauseEvery={setPauseEvery}
  setPauseDurationSeconds={setPauseDurationSeconds}
/>
</section>
      {/* =========================
          PROGRESSO
      ========================= */}

      

      <QueueProgress
        sending={queue.sending}
        currentIndex={queue.currentIndex}
        total={numbers.length}
        estimatedTotalSeconds={queue.estimatedTotalSeconds}
        remainingSeconds={queue.remainingSeconds}
        elapsedSeconds={queue.elapsedSeconds}
        estimatedEndTime={queue.estimatedEndTime}
        nextSendSeconds={queue.nextSendSeconds}
        isPaused={queue.isPaused}
        formatTime={queue.formatTime}
        onStop={queue.pararEnvio}
        sendResults={queue.sendResults}
      />


      <Button
        type="button"
        variant="secondary"
        className="mt-5 w-full"
        onClick={queue.enviarFila}
        disabled={
          queue.sending ||
          !connected ||
          numbers.length === 0 ||
          message.trim().length <=0
        }
      >
        {queue.sending
          ? "Enviando..."
          : <> <Send/> Enviar mensagens</>}
      </Button>

      {/* =========================
          RESULTADO
      ========================= */}

      
    </main>
    </>
  );
}

