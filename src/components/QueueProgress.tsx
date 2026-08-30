type QueueProgressProps = {
  sending: boolean;
  currentIndex: number;
  total: number;
  onStop: () => void;
};

function QueueProgress({
  sending,
  currentIndex,
  total,
  onStop
}: QueueProgressProps) {
  if (!sending) {
    return null;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <p>
        Enviando {currentIndex} de {total}
      </p>

      <button
        type="button"
        onClick={onStop}
      >
        ⏹ Parar envio
      </button>
    </div>
  );
}

export default QueueProgress;

