import {
useEffect,
useRef,
useState
} from "react";

type Props = {
numbers: string[];
connected: boolean;
message: string;
minIntervalSeconds: number;
maxIntervalSeconds: number;
pauseEvery: number;
pauseDurationSeconds: number;
};

export function useMessageQueue({
numbers,
connected,
message,
minIntervalSeconds,
maxIntervalSeconds,
pauseEvery,
pauseDurationSeconds
}: Props) {

const [sending, setSending] =
useState(false);

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

const stopRequested =
useRef(false);

const timerRef =
useRef<ReturnType<typeof setInterval> | null>(null);

const startTimeRef =
useRef<number | null>(null);

const nextActionTimeRef =
useRef<number | null>(null);

// =========================
// PARAR ENVIO
// =========================

function pararEnvio() {
stopRequested.current = true;
}

// =========================
// ESPERA
// =========================

function wait(milliseconds: number) {
return new Promise<void>((resolve) => {
setTimeout(
resolve,
milliseconds
);
});
}

// =========================
// INTERVALO ALEATÓRIO
// =========================

function randomInterval(
min: number,
max: number
) {
return (
Math.floor(
Math.random() *
(max - min + 1)
) + min
);
}

// =========================
// CALCULAR QUANTIDADE
// DE PAUSAS
// =========================

function calculatePauseCount(
totalNumbers: number
) {


if (
  totalNumbers <= 1 ||
  pauseEvery < 1
) {
  return 0;
}

return Math.floor(
  (totalNumbers - 1) /
    pauseEvery
);


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

// Média do intervalo aleatório
const averageInterval =
  (min + max) / 2;

// Quantidade de intervalos
const numberOfIntervals =
  totalNumbers - 1;

const intervalTime =
  numberOfIntervals *
  averageInterval;

// Quantidade de pausas
const numberOfPauses =
  calculatePauseCount(
    totalNumbers
  );

const pauseTime =
  numberOfPauses *
  Math.max(
    0,
    pauseDurationSeconds
  );

return Math.ceil(
  intervalTime +
    pauseTime
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

// Quantidade de intervalos
// que ainda serão necessários
const remainingIntervals =
  Math.max(
    0,
    remainingNumbers - 1
  );

const intervalTime =
  remainingIntervals *
  averageInterval;

// =========================
// PAUSAS FUTURAS
// =========================

let remainingPauses = 0;

if (pauseEvery > 0) {

  for (
    let nextPause =
      Math.ceil(
        (sentCount + 1) /
          pauseEvery
      ) *
      pauseEvery;

    nextPause <
      totalNumbers;

    nextPause +=
      pauseEvery
  ) {

    if (
      nextPause >
      sentCount
    ) {
      remainingPauses++;
    }
  }
}

const pauseTime =
  remainingPauses *
  Math.max(
    0,
    pauseDurationSeconds
  );

return Math.ceil(
  intervalTime +
    pauseTime
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

// Só atualiza a estimativa
// inicial quando não estiver enviando
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
sending
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
        Math.floor(
          elapsed
        );

      setElapsedSeconds(
        elapsedRounded
      );

      // =========================
      // TEMPO TOTAL RESTANTE
      // =========================

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
estimatedTotalSeconds
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

if (!message.trim()) {

  setResult(
    "❌ Digite uma mensagem."
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

setCurrentIndex(0);

setElapsedSeconds(0);

setRemainingSeconds(0);

setNextSendSeconds(null);

setIsPaused(false);

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

  if (
    stopRequested.current
  ) {
    break;
  }

  const number =
    numbers[index];

  const sentCount =
    index + 1;

  setCurrentIndex(
    sentCount
  );

  // =========================
  // ENVIO
  // =========================

  try {

    await window.whatsapp.enviarMensagem(
      number,
      message
    );

    console.log(
      `Mensagem enviada para ${number}`
    );

  } catch (error) {

    console.error(
      `Erro ao enviar para ${number}:`,
      error
    );
  }

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

setNextSendSeconds(null);

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

formatTime,

enviarFila,
pararEnvio


};
}
