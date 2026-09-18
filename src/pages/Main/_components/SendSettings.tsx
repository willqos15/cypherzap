import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { Input } from "../../../components/ui/input";

type Preset = {
  id: string;
  name: string;
  min: number;
  max: number;
  pauseEvery: number;
  pauseDuration: number;
  description: string;
};

type Props = {
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  pauseEvery: number;
  pauseDurationSeconds: number;

  setMinIntervalSeconds: (value: number) => void;
  setMaxIntervalSeconds: (value: number) => void;
  setPauseEvery: (value: number) => void;
  setPauseDurationSeconds: (value: number) => void;

  sending: boolean;
};

const presets: Preset[] = [
  {
    id: "muito-rapido",
    name: "Muito Rápido",
    min: 30,
    max: 40,
    pauseEvery: 50,
    pauseDuration: 2,
    description:
      "30–40 segundos entre mensagens, com pausa de 2 minutos a cada 50 envios.",
  },
  {
    id: "rapido",
    name: "Rápido",
    min: 40,
    max: 50,
    pauseEvery: 30,
    pauseDuration: 5,
    description:
      "40–50 segundos entre mensagens, com pausa de 5 minutos a cada 30 envios.",
  },
  {
    id: "normal",
    name: "Normal",
    min: 50,
    max: 60,
    pauseEvery: 20,
    pauseDuration: 5,
    description:
      "50–60 segundos entre mensagens, com pausa de 5 minutos a cada 20 envios.",
  },
  {
    id: "normal-lento",
    name: "Normal/Lento",
    min: 60,
    max: 70,
    pauseEvery: 10,
    pauseDuration: 10,
    description:
      "60–70 segundos entre mensagens, com pausa de 10 minutos a cada 10 envios.",
  },
  {
    id: "lento",
    name: "Lento",
    min: 120,
    max: 130,
    pauseEvery: 10,
    pauseDuration: 15,
    description:
      "2 minutos entre mensagens, com pausa de 15 minutos a cada 10 envios.",
  },
  {
    id: "muito-lento",
    name: "Muito Lento",
    min: 180,
    max: 210,
    pauseEvery: 8,
    pauseDuration: 20,
    description:
      "3 minutos entre mensagens, com pausa de 20 minutos a cada 8 envios.",
  },
];

export function SendSettings({
  minIntervalSeconds,
  maxIntervalSeconds,
  pauseEvery,
  pauseDurationSeconds,

  setMinIntervalSeconds,
  setMaxIntervalSeconds,
  setPauseEvery,
  setPauseDurationSeconds,

  sending,
}: Props) {
  const [customize, setCustomize] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("normal");

  const [minInterval, setMinInterval] = useState(
    String(minIntervalSeconds),
  );
  const [maxInterval, setMaxInterval] = useState(
    String(maxIntervalSeconds),
  );
  const [pauseEveryValue, setPauseEveryValue] = useState(
    String(pauseEvery),
  );
  const [pauseDuration, setPauseDuration] = useState(
    String(pauseDurationSeconds),
  );

  useEffect(() => {
    if (sending) return;

    setMinInterval(String(minIntervalSeconds));
    setMaxInterval(String(maxIntervalSeconds));
    setPauseEveryValue(String(pauseEvery));
    setPauseDuration(String(pauseDurationSeconds));
  }, [
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds,
    sending,
  ]);

  function normalizeValue(value: string) {
    if (value === "") return "";

    return value.replace(/^0+(?=\d)/, "");
  }

  function applyPreset(preset: Preset) {
    setSelectedPreset(preset.id);

    setMinInterval(String(preset.min));
    setMaxInterval(String(preset.max));
    setPauseEveryValue(String(preset.pauseEvery));
    setPauseDuration(String(preset.pauseDuration));

    setMinIntervalSeconds(preset.min);
    setMaxIntervalSeconds(preset.max);
    setPauseEvery(preset.pauseEvery);
    setPauseDurationSeconds(preset.pauseDuration);
  }

  function handleMinChange(value: string) {
    const normalized = normalizeValue(value);

    setSelectedPreset("custom");
    setMinInterval(normalized);

    if (normalized === "") return;

    const newMin = Math.max(1, Number(normalized));

    setMinInterval(String(newMin));
    setMinIntervalSeconds(newMin);

    if (newMin > maxIntervalSeconds) {
      setMaxInterval(String(newMin));
      setMaxIntervalSeconds(newMin);
    }
  }

  function handleMaxChange(value: string) {
    const normalized = normalizeValue(value);

    setSelectedPreset("custom");
    setMaxInterval(normalized);

    if (normalized === "") return;

    const newMax = Math.max(1, Number(normalized));

    setMaxInterval(String(newMax));
    setMaxIntervalSeconds(newMax);

    if (newMax < minIntervalSeconds) {
      setMinInterval(String(newMax));
      setMinIntervalSeconds(newMax);
    }
  }

  function handlePauseEveryChange(value: string) {
    const normalized = normalizeValue(value);

    setSelectedPreset("custom");
    setPauseEveryValue(normalized);

    if (normalized === "") return;

    const newValue = Math.max(1, Number(normalized));

    setPauseEveryValue(String(newValue));
    setPauseEvery(newValue);
  }

  function handlePauseDurationChange(value: string) {
    const normalized = normalizeValue(value);

    setSelectedPreset("custom");
    setPauseDuration(normalized);

    if (normalized === "") return;

    const newValue = Math.max(1, Number(normalized));

    setPauseDuration(String(newValue));
    setPauseDurationSeconds(newValue);
  }

  return (
    <section className="bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">
          Configuração de envio
        </h2>

        <button
          type="button"
          disabled={sending}
          onClick={() => setCustomize((value) => !value)}
          className="flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
          title={
            customize
              ? "Voltar para configurações padrão"
              : "Personalizar configurações"
          }
        >
          <ArrowLeftRight size={17} />

          <span>
            {customize ? "Personalizado" : "Padrão"}
          </span>
        </button>
      </div>

      {!customize && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {presets.map((preset) => {
            const selected = selectedPreset === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                disabled={sending}
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                } disabled:pointer-events-none disabled:opacity-50`}
              >
                <div className="mb-1 text-sm font-medium text-gray-900">
                  {preset.name}
                </div>

                <p className="text-xs leading-5 text-gray-500">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {customize && (
        <div className="flex flex-wrap gap-4">
          {/* Intervalo */}
          <div className="w-75 shrink-0 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-800">
              Intervalo entre mensagens
            </h3>

            <div className="grid grid-cols-[70px_64px_1fr] items-center gap-x-2 gap-y-2">
              <span className="text-sm text-gray-600">
                Mínimo
              </span>

              <Input
                type="number"
                min={1}
                value={minInterval}
                disabled={sending}
                onChange={(e) => handleMinChange(e.target.value)}
                className="h-8 w-16 px-2 text-center"
              />

              <span className="text-sm text-gray-400">
                segundos
              </span>

              <span className="text-sm text-gray-600">
                Máximo
              </span>

              <Input
                type="number"
                min={1}
                value={maxInterval}
                disabled={sending}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="h-8 w-16 px-2 text-center"
              />

              <span className="text-sm text-gray-400">
                segundos
              </span>
            </div>
          </div>

          {/* Pausa */}
          <div className="w-75 shrink-0 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-800">
              Pausa após envios
            </h3>

            <div className="grid grid-cols-[70px_64px_1fr] items-center gap-x-2 gap-y-2">
              <span className="text-sm text-gray-600">
                A cada
              </span>

              <Input
                type="number"
                min={1}
                value={pauseEveryValue}
                disabled={sending}
                onChange={(e) =>
                  handlePauseEveryChange(e.target.value)
                }
                className="h-8 w-16 px-2 text-center"
              />

              <span className="text-sm text-gray-400">
                envios
              </span>

              <span className="text-sm text-gray-600">
                Duração
              </span>

              <Input
                type="number"
                min={1}
                value={pauseDuration}
                disabled={sending}
                onChange={(e) =>
                  handlePauseDurationChange(e.target.value)
                }
                className="h-8 w-16 px-2 text-center"
              />

              <span className="text-sm text-gray-400">
                minutos
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}