
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MessageModel,
} from "../types/MessageModel";
import type { SendResult } from "../types/sendResult";

type Props = {
  numbers: string[];
  connected: boolean;
   message: string;

  models: MessageModel[];
  selectedModelId: string | null;

  minIntervalSeconds: number;
  maxIntervalSeconds: number;

  pauseEvery: number;
  pauseDurationSeconds: number;
};

export function useMessageQueue({
  numbers,
  connected,
  models,
  selectedModelId,
  minIntervalSeconds,
  maxIntervalSeconds,
  pauseEvery,
  pauseDurationSeconds,
  message,
}: Props) {
  const [sending, setSending] = useState(false);

  const [sendResults, setSendResults] = useState<SendResult[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [result, setResult] =
    useState("");

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [estimatedTotalSeconds, setEstimatedTotalSeconds] =
    useState(0);

  const [estimatedEndTime, setEstimatedEndTime] =
    useState<Date | null>(null);

  const [nextSendSeconds, setNextSendSeconds] =
    useState<number | null>(null);

  const [isPaused, setIsPaused] =
    useState(false);

  const [currentMessage, setCurrentMessage] =
    useState("");

  const stopRequested =
    useRef(false);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const startTimeRef =
    useRef<number | null>(null);

  const nextActionTimeRef =
    useRef<number | null>(null);

  // =========================
  // PARAR ENVIO
  // =========================

  function pararEnvio() {
    stopRequested.current = true;

    /*
     * O envio atual não é cancelado no meio.
     * O hook para assim que terminar a operação atual.
     */
  }

  // =========================
  // ESPERA
  // =========================

  function wait(milliseconds: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  // =========================
  // INTERVALO ALEATÓRIO
  // =========================

  function randomInterval(
    min: number,
    max: number
  ) {
    const safeMin = Math.max(
      0,
      Math.floor(min)
    );

    const safeMax = Math.max(
      safeMin,
      Math.floor(max)
    );

    return (
      Math.floor(
        Math.random() *
          (safeMax - safeMin + 1)
      ) + safeMin
    );
  }


  function getSelectedModel(): MessageModel | null {
    if (!selectedModelId) {
      return null;
    }

    return (
      models.find(
        (model) =>
          model.id === selectedModelId
      ) ?? null
    );
  }


  // function getRandomVariant(
  //   model: MessageModel
  // ) {
  //   if (
  //     !model.variantes ||
  //     model.variantes.length === 0
  //   ) {
  //     return null;
  //   }

  //   const index = Math.floor(
  //     Math.random() *
  //       model.variantes.length
  //   );

  //   return model.variantes[index];
  // }


  // function getMessageFromModel(): string {
  //   const model =
  //     getSelectedModel();

  //   if (!model) {
  //     return "";
  //   }

  //   const variant =
  //     getRandomVariant(model);

  //   if (!variant) {
  //     return "";
  //   }

  //   return variant.texto.trim();
  // }



  // =========================
  // CALCULAR TEMPO ESTIMADO
  // =========================


  // =========================
// GERAR MENSAGEM DA VARIANTE
// =========================

function getMessageForIndex(index: number): string {
  const model = getSelectedModel();

  // Se existe modelo selecionado, usa as variantes
  if (model && model.variantes.length > 0) {
    const variantIndex =
      index % model.variantes.length;

    return model.variantes[variantIndex].texto.trim();
  }

  // Caso contrário, usa a mensagem digitada
  return message.trim();
}

  function calculateEstimatedTime(
    totalNumbers: number
  ) {
    if (totalNumbers <= 1) {
      return 0;
    }

    const min = Math.max(
      0,
      minIntervalSeconds
    );

    const max = Math.max(
      min,
      maxIntervalSeconds
    );

    const averageInterval =
      (min + max) / 2;

    /*
     * Aqui consideramos que entre cada envio
     * existe um intervalo, EXCETO quando o envio
     * anterior é múltiplo de pauseEvery.
     *
     * Nesse caso entra a pausa longa.
     */

    let totalTime = 0;

    for (
      let sentCount = 1;
      sentCount < totalNumbers;
      sentCount++
    ) {
      if (
        pauseEvery > 0 &&
        sentCount % pauseEvery === 0
      ) {
        totalTime += Math.max(
          0,
          pauseDurationSeconds
        );
      } else {
        totalTime +=
          averageInterval;
      }
    }

    return Math.ceil(totalTime);
  }

  // =========================
  // CALCULAR TEMPO RESTANTE
  // =========================

  function calculateRemainingTime(
    totalNumbers: number,
    sentCount: number
  ) {
    const remainingNumbers =
      totalNumbers - sentCount;

    if (
      remainingNumbers <= 0
    ) {
      return 0;
    }

    const min = Math.max(
      0,
      minIntervalSeconds
    );

    const max = Math.max(
      min,
      maxIntervalSeconds
    );

    const averageInterval =
      (min + max) / 2;

    let totalTime = 0;

    /*
     * sentCount representa quantas mensagens
     * já foram enviadas.
     *
     * Agora calculamos cada espera futura.
     */

    for (
      let nextSentCount =
        sentCount;
      nextSentCount <
      totalNumbers;
      nextSentCount++
    ) {
      if (
        pauseEvery > 0 &&
        nextSentCount %
          pauseEvery ===
          0
      ) {
        totalTime += Math.max(
          0,
          pauseDurationSeconds
        );
      } else {
        totalTime +=
          averageInterval;
      }
    }

    return Math.ceil(totalTime);
  }

  // =========================
  // FORMATAR TEMPO
  // =========================

  function formatTime(
    seconds: number
  ) {
    const total = Math.max(
      0,
      Math.ceil(seconds)
    );

    const hours = Math.floor(
      total / 3600
    );

    const minutes = Math.floor(
      (total % 3600) / 60
    );

    const secs = total % 60;

    if (hours > 0) {
      return `${hours}h ${minutes
        .toString()
        .padStart(2, "0")}min`;
    }

    if (minutes > 0) {
      return `${minutes}min ${secs
        .toString()
        .padStart(2, "0")}s`;
    }

    return `${secs}s`;
  }

  // =========================
  // ESTIMATIVA ANTES DO ENVIO
  // =========================

  useEffect(() => {
    if (
      numbers.length === 0 ||
      pauseEvery < 1 ||
      minIntervalSeconds < 0 ||
      maxIntervalSeconds < 0 ||
      minIntervalSeconds >
        maxIntervalSeconds ||
      pauseDurationSeconds < 0
    ) {
      setEstimatedTotalSeconds(0);
      setRemainingSeconds(0);
      setEstimatedEndTime(null);

      return;
    }

    const estimated =
      calculateEstimatedTime(
        numbers.length
      );

    setEstimatedTotalSeconds(
      estimated
    );

    if (!sending) {
      setRemainingSeconds(
        estimated
      );

      setEstimatedEndTime(
        new Date(
          Date.now() +
            estimated * 1000
        )
      );
    }
  }, [
    numbers.length,
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds,
    sending,
  ]);

  // =========================
  // CONTADOR EM TEMPO REAL
  // =========================

  useEffect(() => {
    if (!sending) {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }

      return;
    }

    timerRef.current =
      setInterval(() => {
        const now =
          Date.now();

        // =========================
        // TEMPO DECORRIDO
        // =========================

        if (
          startTimeRef.current
        ) {
          const elapsed =
            (
              now -
              startTimeRef.current
            ) / 1000;

          const elapsedRounded =
            Math.floor(elapsed);

          setElapsedSeconds(
            elapsedRounded
          );

          const totalEstimated =
            estimatedTotalSeconds;

          const remaining =
            Math.max(
              0,
              totalEstimated -
                elapsedRounded
            );

          setRemainingSeconds(
            remaining
          );

          setEstimatedEndTime(
            new Date(
              now +
                remaining * 1000
            )
          );
        }

        // =========================
        // PRÓXIMO ENVIO
        // =========================

        if (
          nextActionTimeRef.current
        ) {
          const remaining =
            Math.max(
              0,
              Math.ceil(
                (
                  nextActionTimeRef.current -
                  now
                ) / 1000
              )
            );

          setNextSendSeconds(
            remaining
          );
        }
      }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }
    };
  }, [
    sending,
    estimatedTotalSeconds,
  ]);

  // =========================
  // ESPERAR COM CONTADOR
  // =========================

  async function esperarComContador(
    seconds: number
  ) {
    if (seconds <= 0) {
      return;
    }

    const milliseconds =
      seconds * 1000;

    nextActionTimeRef.current =
      Date.now() +
      milliseconds;

    setNextSendSeconds(
      seconds
    );

    await wait(
      milliseconds
    );

    nextActionTimeRef.current =
      null;

    setNextSendSeconds(
      null
    );
  }

  // =========================
  // ENVIAR FILA
  // =========================

  async function enviarFila() {
    // =========================
    // VALIDAÇÕES
    // =========================

    if (!connected) {
      setResult(
        "❌ WhatsApp não conectado."
      );

      return;
    }

    if (numbers.length === 0) {
      setResult(
        "❌ Adicione pelo menos um número."
      );

      return;
    }

    
    

    // const selectedModel =
    //   getSelectedModel();

    // if (!selectedModel) {
    //   setResult(
    //     "❌ O modelo selecionado não foi encontrado."
    //   );

    //   return;
    // }

    // if (
    //   !selectedModel.variantes ||
    //   selectedModel.variantes.length === 0
    // ) {
    //   setResult(
    //     "❌ O modelo selecionado não possui variantes."
    //   );

    //   return;
    // }

    if (
      minIntervalSeconds < 0 ||
      maxIntervalSeconds < 0
    ) {
      setResult(
        "❌ Intervalo inválido."
      );

      return;
    }

    if (
      minIntervalSeconds >
      maxIntervalSeconds
    ) {
      setResult(
        "❌ O intervalo mínimo não pode ser maior que o máximo."
      );

      return;
    }

    if (pauseEvery < 1) {
      setResult(
        "❌ A pausa deve acontecer após pelo menos 1 envio."
      );

      return;
    }

    if (
      pauseDurationSeconds < 0
    ) {
      setResult(
        "❌ Duração da pausa inválida."
      );

      return;
    }

    // =========================
    // INICIA
    // =========================

    setSending(true);
    setResult("");
    setSendResults([]); 


    setCurrentIndex(0);

    setElapsedSeconds(0);

    setRemainingSeconds(0);

    setNextSendSeconds(null);

    setIsPaused(false);

    setCurrentMessage("");

    stopRequested.current =
      false;

    startTimeRef.current =
      Date.now();

    // =========================
    // ESTIMATIVA INICIAL
    // =========================

    const initialEstimate =
      calculateEstimatedTime(
        numbers.length
      );

    setEstimatedTotalSeconds(
      initialEstimate
    );

    setRemainingSeconds(
      initialEstimate
    );

    setEstimatedEndTime(
      new Date(
        Date.now() +
          initialEstimate *
            1000
      )
    );

    // =========================
    // PROCESSA FILA
    // =========================

    for (
      let index = 0;
      index < numbers.length;
      index++
    ) {
      // =========================
      // PARAR
      // =========================

      if (
        stopRequested.current
      ) {
        break;
      }

      const number =
        numbers[index];

  

      // =========================
      // ESCOLHER VARIANTE
      // =========================

      const messageToSend =
  getMessageForIndex(index);

if (!messageToSend) {
  setResult(
    "❌ Digite uma mensagem ou selecione um modelo."
  );
  break;
}

setCurrentMessage(messageToSend);

      // =========================
      // ENVIO
      // =========================

      try {
  await window.whatsapp.enviarMensagem(
    number,
      messageToSend
  );

  setSendResults((prev) => [
    ...prev,
    {
      number,
      status: "success",
      sentAt: new Date(),
      messageToSend,
    },
  ]);

  console.log(
    `Mensagem enviada para ${number}`
  );

  console.log(
    `Mensagem utilizada: ${message}`
  );

} catch (error) {

  setSendResults((prev) => [
    ...prev,
    {
      number,
      status: "failed",
      sentAt: new Date(),
      messageToSend,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
    },
  ]);

  console.error(
    `Erro ao enviar para ${number}:`,
    error
  );
}

    const sentCount = index + 1;

      setCurrentIndex(sentCount);

      // =========================
      // ATUALIZA ESTIMATIVA
      // =========================

      const estimatedRemaining =
        calculateRemainingTime(
          numbers.length,
          sentCount
        );

      setRemainingSeconds(
        estimatedRemaining
      );

      setEstimatedEndTime(
        new Date(
          Date.now() +
            estimatedRemaining *
              1000
        )
      );

      // =========================
      // PARAR
      // =========================

      if (
        stopRequested.current
      ) {
        break;
      }

      // =========================
      // PAUSA LONGA
      // =========================

      if (
        sentCount %
          pauseEvery ===
          0 &&
        sentCount <
          numbers.length
      ) {
        setIsPaused(true);

        await esperarComContador(
          pauseDurationSeconds
        );

        setIsPaused(false);

        if (
          stopRequested.current
        ) {
          break;
        }
      }

      // =========================
      // INTERVALO NORMAL
      // =========================

      else if (
        index <
        numbers.length - 1
      ) {
        const interval =
          randomInterval(
            minIntervalSeconds,
            maxIntervalSeconds
          );

        console.log(
          `Próximo envio em ${interval} segundos.`
        );

        await esperarComContador(
          interval
        );

        if (
          stopRequested.current
        ) {
          break;
        }
      }
    }

    // =========================
    // FINALIZA
    // =========================

    setSending(false);

    setIsPaused(false);

    setNextSendSeconds(
      null
    );

    startTimeRef.current =
      null;

    nextActionTimeRef.current =
      null;

    if (
      stopRequested.current
    ) {
      setResult(
        "⏹️ Fila interrompida."
      );
    } else {
      setCurrentIndex(
        numbers.length
      );

      setRemainingSeconds(0);

      setEstimatedEndTime(
        new Date()
      );

      setResult(
        "✅ Fila finalizada."
      );
    }
  }

  // =========================
  // RETORNO
  // =========================

  return {
    sending,

    currentIndex,

    result,

    estimatedTotalSeconds,

    remainingSeconds,

    elapsedSeconds,

    estimatedEndTime,

    nextSendSeconds,

    isPaused,

    currentMessage,

    formatTime,

    enviarFila,

    pararEnvio,

    sendResults,
  };
}

