import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MessageModel,
} from "../types/MessageModel";

import type {
  SendResult,
} from "../types/sendResult";

import type {
  MessageAttachmentData,
} from "../types/Attachment";

type Props = {
  numbers: string[];
  connected: boolean;
  message: string;
  attachment: MessageAttachmentData | null;
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
  attachment,
}: Props) {
  // =========================
  // ESTADOS
  // =========================

  const [sending, setSending] = useState(false);

  const [sendResults, setSendResults] =
    useState<SendResult[]>([]);

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

  // =========================
  // CONTROLE INTERNO DA FILA
  // =========================

  const stopRequested =
    useRef(false);

  const pauseRequested =
    useRef(false);

  /**
   * Índice REAL da fila.
   *
   * Diferente do currentIndex, que é
   * apenas estado para atualizar a interface.
   */
  const queueIndexRef =
    useRef(0);

  /**
   * Mantém o estado atual da conexão
   * disponível dentro das funções assíncronas.
   */
  const connectedRef =
    useRef(connected);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const startTimeRef =
    useRef<number | null>(null);

  const nextActionTimeRef =
    useRef<number | null>(null);

  /**
   * Tempo total que a fila ficou pausada.
   *
   * É utilizado para que o contador geral
   * não continue contando enquanto pausado.
   */
  const totalPausedTimeRef =
    useRef(0);

  /**
   * Momento em que uma pausa começou.
   */
  const pauseStartedAtRef =
    useRef<number | null>(null);

  // =========================
  // ATUALIZAR CONEXÃO
  // =========================

  useEffect(() => {
    connectedRef.current =
      connected;
  }, [connected]);

  // =========================
  // ESPERA
  // =========================

  function wait(
    milliseconds: number
  ) {
    return new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds
        );
      }
    );
  }

  // =========================
  // INTERVALO ALEATÓRIO
  // =========================

  function randomInterval(
    min: number,
    max: number
  ) {
    const safeMin =
      Math.max(
        0,
        Math.floor(min)
      );

    const safeMax =
      Math.max(
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

  // =========================
  // MODELO SELECIONADO
  // =========================

  function getSelectedModel():
    MessageModel | null {
    if (!selectedModelId) {
      return null;
    }

    return (
      models.find(
        (model) =>
          model.id ===
          selectedModelId
      ) ?? null
    );
  }

  // =========================
  // GERAR MENSAGEM DA VARIANTE
  // =========================

  function getMessageForIndex(
    index: number
  ): string {
    const model =
      getSelectedModel();

    /**
     * Se existe modelo selecionado,
     * utiliza as variantes de forma
     * determinística.
     */
    if (
      model &&
      model.variantes.length > 0
    ) {
      const variantIndex =
        index %
        model.variantes.length;

      return model
        .variantes[variantIndex]
        .texto.trim();
    }

    /**
     * Caso não exista modelo,
     * utiliza a mensagem digitada.
     */
    return message.trim();
  }

  // =========================
  // CALCULAR TEMPO ESTIMADO
  // =========================

  function calculateEstimatedTime(
    totalNumbers: number
  ) {
    if (totalNumbers <= 1) {
      return 0;
    }

    const min =
      Math.max(
        0,
        minIntervalSeconds
      );

    const max =
      Math.max(
        min,
        maxIntervalSeconds
      );

    const averageInterval =
      (min + max) / 2;

    let totalTime = 0;

    /**
     * Entre cada envio existe um intervalo,
     * exceto quando entra a pausa longa.
     */
    for (
      let sentCount = 1;
      sentCount < totalNumbers;
      sentCount++
    ) {
      if (
        pauseEvery > 0 &&
        sentCount %
          pauseEvery ===
          0
      ) {
        totalTime +=
          Math.max(
            0,
            pauseDurationSeconds
          );
      } else {
        totalTime +=
          averageInterval;
      }
    }

    return Math.ceil(
      totalTime
    );
  }

  // =========================
  // CALCULAR TEMPO RESTANTE
  // =========================

  function calculateRemainingTime(
    totalNumbers: number,
    sentCount: number
  ) {
    const remainingNumbers =
      totalNumbers -
      sentCount;

    if (
      remainingNumbers <= 0
    ) {
      return 0;
    }

    const min =
      Math.max(
        0,
        minIntervalSeconds
      );

    const max =
      Math.max(
        min,
        maxIntervalSeconds
      );

    const averageInterval =
      (min + max) / 2;

    let totalTime = 0;

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
        totalTime +=
          Math.max(
            0,
            pauseDurationSeconds
          );
      } else {
        totalTime +=
          averageInterval;
      }
    }

    return Math.ceil(
      totalTime
    );
  }

  // =========================
  // FORMATAR TEMPO
  // =========================

  function formatTime(
    seconds: number
  ) {
    const total =
      Math.max(
        0,
        Math.ceil(seconds)
      );

    const hours =
      Math.floor(
        total / 3600
      );

    const minutes =
      Math.floor(
        (total % 3600) / 60
      );

    const secs =
      total % 60;

    if (hours > 0) {
      return `${hours}h ${minutes
        .toString()
        .padStart(
          2,
          "0"
        )}min`;
    }

    if (minutes > 0) {
      return `${minutes}min ${secs
        .toString()
        .padStart(
          2,
          "0"
        )}s`;
    }

    return `${secs}s`;
  }

  // =========================
  // REGISTRAR PAUSA
  // =========================

  function iniciarContagemDaPausa() {
    if (
      pauseStartedAtRef.current ===
      null
    ) {
      pauseStartedAtRef.current =
        Date.now();
    }
  }

  // =========================
  // FINALIZAR CONTAGEM DA PAUSA
  // =========================

  function finalizarContagemDaPausa() {
    if (
      pauseStartedAtRef.current !==
      null
    ) {
      totalPausedTimeRef.current +=
        Date.now() -
        pauseStartedAtRef.current;

      pauseStartedAtRef.current =
        null;
    }
  }

  // =========================
  // ESPERAR RETOMADA
  // =========================

  async function esperarRetomada() {
    while (
      pauseRequested.current
    ) {
      if (
        stopRequested.current
      ) {
        return;
      }

      iniciarContagemDaPausa();

      await wait(200);
    }

    finalizarContagemDaPausa();
  }

  // =========================
  // ESPERAR CONEXÃO
  // =========================

  async function esperarConexao() {
    let avisouDesconexao =
      false;

    while (
      !connectedRef.current
    ) {
      if (
        stopRequested.current
      ) {
        return;
      }

      pauseRequested.current =
        true;

      setIsPaused(true);

      iniciarContagemDaPausa();

      if (!avisouDesconexao) {
        setResult(
          "⚠️ WhatsApp desconectado. Aguardando conexão..."
        );

        avisouDesconexao = true;
      }

      await wait(500);
    }

    if (
      pauseRequested.current &&
      avisouDesconexao
    ) {
      pauseRequested.current =
        false;

      finalizarContagemDaPausa();

      setIsPaused(false);

      setResult(
        "▶️ WhatsApp conectado. Fila retomada."
      );
    }
  }

  // =========================
  // PAUSAR ENVIO
  // =========================

  function pausarEnvio() {
    if (!sending) {
      return;
    }

    pauseRequested.current =
      true;

    iniciarContagemDaPausa();

    setIsPaused(true);

    setResult(
      "⏸️ Fila pausada."
    );
  }

  // =========================
  // CONTINUAR ENVIO
  // =========================

  function continuarEnvio() {

    console.log('executou ce')
    if (!sending) {
      return;
    }

     console.log('!sending ce')

    pauseRequested.current =
      false;

    finalizarContagemDaPausa();

    setIsPaused(false);

    setResult(
      "▶️ Fila retomada."
    );

     console.log('ce completo')
  }

  // =========================
  // PARAR ENVIO
  // =========================

  function pararEnvio() {
    if (!sending) {
      return;
    }

    stopRequested.current =
      true;

    pauseRequested.current =
      false;

    finalizarContagemDaPausa();

    setIsPaused(false);

    setResult(
      "⏹️ Encerrando fila..."
    );
  }

  // =========================
  // ESPERAR COM CONTADOR
  // =========================

  async function esperarComContador(
    seconds: number
  ) {
    if (seconds <= 0) {
      return;
    }

    let remaining =
      seconds;

    while (
      remaining > 0
    ) {
      if (
        stopRequested.current
      ) {
        return;
      }

      /**
       * Se estiver pausado,
       * congela completamente.
       */
      await esperarRetomada();

      if (
        stopRequested.current
      ) {
        return;
      }

      /**
       * Se o WhatsApp desconectar
       * durante o intervalo, pausa.
       */
      if (
        !connectedRef.current
      ) {
        await esperarConexao();

        if (
          stopRequested.current
        ) {
          return;
        }
      }

      const startedAt =
        Date.now();

      nextActionTimeRef.current =
        startedAt +
        remaining * 1000;

      setNextSendSeconds(
        Math.ceil(remaining)
      );

      /**
       * Atualiza a cada 250ms.
       */
      await wait(250);

      if (
        stopRequested.current
      ) {
        return;
      }

      /**
       * Se pausou durante esses 250ms,
       * não desconta esse tempo.
       */
      if (
        pauseRequested.current
      ) {
        continue;
      }

      /**
       * Se desconectou, não desconta
       * esse período.
       */
      if (
        !connectedRef.current
      ) {
        continue;
      }

      const elapsed =
        (Date.now() -
          startedAt) /
        1000;

      remaining =
        Math.max(
          0,
          remaining -
            elapsed
        );
    }

    nextActionTimeRef.current =
      null;

    setNextSendSeconds(
      null
    );
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
      setEstimatedTotalSeconds(
        0
      );

      setRemainingSeconds(
        0
      );

      setEstimatedEndTime(
        null
      );

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
      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }

      return;
    }

    timerRef.current =
      setInterval(() => {
        const now =
          Date.now();

        if (
          startTimeRef.current
        ) {
          /**
           * Tempo total desde o começo.
           */
          const totalElapsed =
            now -
            startTimeRef.current;

          /**
           * Remove o tempo em que
           * a fila ficou pausada.
           */
          const activeElapsed =
            Math.max(
              0,
              totalElapsed -
                totalPausedTimeRef.current -
                (
                  pauseStartedAtRef.current
                    ? now -
                      pauseStartedAtRef.current
                    : 0
                )
            );

          const elapsedSecondsValue =
            Math.floor(
              activeElapsed /
                1000
            );

          setElapsedSeconds(
            elapsedSecondsValue
          );

          /**
           * O tempo restante também
           * congela durante a pausa.
           */
          const totalEstimated =
            estimatedTotalSeconds;

          const remaining =
            Math.max(
              0,
              totalEstimated -
                elapsedSecondsValue
            );

          setRemainingSeconds(
            remaining
          );

          /**
           * A previsão de término
           * também fica congelada
           * durante a pausa.
           */
          if (
            !pauseRequested.current
          ) {
            setEstimatedEndTime(
              new Date(
                now +
                  remaining * 1000
              )
            );
          }
        }

        // =========================
        // PRÓXIMO ENVIO
        // =========================

        if (
          nextActionTimeRef.current
        ) {
          if (
            pauseRequested.current
          ) {
            /**
             * Durante a pausa,
             * mantém o mesmo valor.
             */
            return;
          }

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
      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }
    };
  }, [
    sending,
    estimatedTotalSeconds,
  ]);

  function clearResults() {
    setSendResults([])
    setCurrentIndex(0)
  }

  // =========================
  // ENVIAR FILA
  // =========================

  async function enviarFila() {
    // =========================
    // VALIDAÇÕES
    // =========================

    if (!connectedRef.current) {
      setResult(
        "❌ WhatsApp não conectado."
      );

      return;
    }

    if (
      numbers.length === 0
    ) {
      setResult(
        "❌ Adicione pelo menos um número."
      );

      return;
    }

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

    if (
      pauseEvery < 1
    ) {
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
    // INICIA NOVA FILA
    // =========================

    setSending(true);

    setResult("");

    setSendResults([]);

    /**
     * Sempre que enviarFila()
     * for chamado, começa uma
     * fila nova.
     */
    queueIndexRef.current =
      0;

    stopRequested.current =
      false;

    pauseRequested.current =
      false;

    totalPausedTimeRef.current =
      0;

    pauseStartedAtRef.current =
      null;

    setCurrentIndex(0);

    setElapsedSeconds(0);

    setRemainingSeconds(0);

    setNextSendSeconds(null);

    setIsPaused(false);

    setCurrentMessage("");

    startTimeRef.current =
      Date.now();

    nextActionTimeRef.current =
      null;

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
          initialEstimate * 1000
      )
    );

    // =========================
    // PREPARAR ANEXO
    // =========================

    let attachmentData:
      | {
          type:
            | "image"
            | "video"
            | "audio"
            | "document";

          buffer: ArrayBuffer;

          fileName: string;

          mimetype: string;
        }
      | undefined;

    if (attachment) {
      attachmentData = {
        type: attachment.type,

        buffer:
          await attachment.file.arrayBuffer(),

        fileName:
          attachment.file.name,

        mimetype:
          attachment.file.type,
      };
    }

    // =========================
    // PROCESSA FILA
    // =========================

    while (
      queueIndexRef.current <
      numbers.length
    ) {
      // =========================
      // PARAR
      // =========================

      if (
        stopRequested.current
      ) {
        break;
      }

      // =========================
      // PAUSAR
      // =========================

      await esperarRetomada();

      if (
        stopRequested.current
      ) {
        break;
      }

      // =========================
      // CONEXÃO
      // =========================

      if (
        !connectedRef.current
      ) {
        await esperarConexao();
      }

      if (
        stopRequested.current
      ) {
        break;
      }

      // =========================
      // ÍNDICE ATUAL
      // =========================

      const index =
        queueIndexRef.current;

      const number =
        numbers[index];

      // =========================
      // ESCOLHER MENSAGEM
      // =========================

      const messageToSend =
        getMessageForIndex(
          index
        );

      /**
       * Permite texto vazio
       * quando existe anexo.
       */
      if (
        !messageToSend &&
        !attachmentData
      ) {
        setResult(
          "❌ Digite uma mensagem ou selecione um anexo."
        );

        break;
      }

      setCurrentMessage(
        messageToSend
      );

      // =========================
      // ENVIO
      // =========================

      try {
        /**
         * Verifica novamente antes
         * de enviar.
         */
        if (
          !connectedRef.current
        ) {
          await esperarConexao();

          if (
            stopRequested.current
          ) {
            break;
          }
        }

        /**
         * Se o usuário pausou exatamente
         * antes do envio, espera.
         */
        await esperarRetomada();

        if (
          stopRequested.current
        ) {
          break;
        }

        await window.whatsapp.enviarMensagem(
          number,
          messageToSend,
          attachmentData
        );

        setSendResults(
          (prev) => [
            ...prev,
            {
              number,

              status:
                "success",

              sentAt:
                new Date(),

              messageToSend,
            },
          ]
        );

        console.log(
          `Mensagem enviada para ${number}`
        );
      } catch (error) {
        setSendResults(
          (prev) => [
            ...prev,
            {
              number,

              status:
                "failed",

              sentAt:
                new Date(),

              messageToSend,

              error:
                error instanceof Error
                  ? error.message
                  : "Erro desconhecido",
            },
          ]
        );

        console.error(
          `Erro ao enviar para ${number}:`,
          error
        );
      }

      // =========================
      // AVANÇA FILA
      // =========================

      queueIndexRef.current++;

      const sentCount =
        queueIndexRef.current;

      setCurrentIndex(
        sentCount
      );

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

      /**
       * Se estiver pausado,
       * a previsão não precisa
       * ficar avançando.
       */
      if (
        !pauseRequested.current
      ) {
        setEstimatedEndTime(
          new Date(
            Date.now() +
              estimatedRemaining *
                1000
          )
        );
      }

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
        /**
         * Essa pausa é a pausa
         * automática configurada
         * pelo usuário.
         */
        setIsPaused(true);

        await esperarComContador(
          pauseDurationSeconds
        );

        if (
          stopRequested.current
        ) {
          break;
        }

        if (
          !connectedRef.current
        ) {
          await esperarConexao();
        }

        if (
          stopRequested.current
        ) {
          break;
        }

        if (
          !pauseRequested.current
        ) {
          setIsPaused(false);
        }
      }

      // =========================
      // INTERVALO NORMAL
      // =========================

      else if (
        sentCount <
        numbers.length
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
    // FINALIZAÇÃO
    // =========================

    finalizarContagemDaPausa();

    setSending(false);

    setIsPaused(false);

    pauseRequested.current =
      false;

    setNextSendSeconds(
      null
    );

    startTimeRef.current =
      null;

    nextActionTimeRef.current =
      null;

    // =========================
    // RESULTADO
    // =========================

    if (
      queueIndexRef.current <
      numbers.length
    ) {
      /**
       * Não completou a fila.
       * Normalmente significa que
       * o usuário clicou em PARAR
       * ou houve algum erro de
       * validação durante a execução.
       */
      setResult(
        "⏹️ Fila interrompida."
      );
    } else {
      /**
       * Fila completa.
       */
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

    /**
     * Importante:
     * só resetamos stopRequested
     * depois de toda a finalização.
     */
    stopRequested.current =
      false;
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

    pausarEnvio,

    continuarEnvio,

    pararEnvio,

    sendResults,

    clearResults
  };
}