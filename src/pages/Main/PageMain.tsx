import { useEffect, useState } from "react";


import { useMessageQueue } from "../../hooks/useMessageQueue";


import QueueProgress from "./_components/QueueProgress";

import MessageComposer from "./_components/Message/MessageComposer";

import type { MessageModel } from "../../types/MessageModel";


import { Toaster } from "sonner";
import { SendSettings } from "./_components/SendSettings";
import { Send } from "lucide-react";
import { Button } from "#components/ui/button";
import type { MessageAttachmentData } from "../../types/Attachment";
import { useWhatsApp } from "../../context/WhatsAppContext";
import NumberCompose from "./_components/NumberPhone/NumberCompose";


interface InterfacePageMain {
  setSending: React.Dispatch<React.SetStateAction<boolean>>;
  autorizado: boolean;
}
export default function PageMain({ setSending, autorizado }: InterfacePageMain) {

  const {
    connected,
    disconnecting,
  } = useWhatsApp();

  const [numbers, setNumbers] = useState<string[]>([]);
  const [message, setMessage] = useState("");


  const [models, setModels] = useState<MessageModel[]>(
    []
  );

  const [attachment, setAttachment] =
    useState<MessageAttachmentData | null>(null);

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


  const queue = useMessageQueue({
    numbers,
    connected,
    models,
    selectedModelId,
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds,
    message,
    attachment,
  });

  useEffect(() => {
    setSending(queue.sending);
  }, [queue.sending, setSending, disconnecting]);

  const styleSection = "bg-white border-gray-300 border-2 rounded-lg p-4 flex flex-col gap-4 mt-5"

  return (
    <>
 
      <Toaster />
      <main className="relative w-full my-10 mx-auto px-10">

        <div className= {`${(!connected || disconnecting || !autorizado) && "pointer-events-none opacity-50"}`}>

          <section className={`${styleSection}`}>

            <NumberCompose  numbers={numbers}
              setNumbers={setNumbers}  disabled={queue.sending}/>

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
              attachment={attachment}
              onAttachmentChange={setAttachment}
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
        </div>



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
            (message.trim().length <= 0 && !attachment)
          }
        >
          {queue.sending
            ? "Enviando..."
            : <> <Send /> Enviar mensagens</>}
        </Button>

        



      </main>
    </>
  );
}

