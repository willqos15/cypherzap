import { useEffect, useState } from "react";
import { Input } from "../../../components/ui/input";

type SendSettingsProps = {
    minIntervalSeconds: number;
    maxIntervalSeconds: number;
    pauseEvery: number;
    pauseDurationSeconds: number;
    sending: boolean;
    setMinIntervalSeconds: (value: number) => void;
    setMaxIntervalSeconds: (value: number) => void;
    setPauseEvery: (value: number) => void;
    setPauseDurationSeconds: (value: number) => void;
};

export function SendSettings({
    minIntervalSeconds,
    maxIntervalSeconds,
    pauseEvery,
    pauseDurationSeconds,
    sending,
    setMinIntervalSeconds,
    setMaxIntervalSeconds,
    setPauseEvery,
    setPauseDurationSeconds,
}: SendSettingsProps) {
    const [minInterval, setMinInterval] = useState(
        String(minIntervalSeconds)
    );
    const [maxInterval, setMaxInterval] = useState(
        String(maxIntervalSeconds)
    );
    const [pauseEveryValue, setPauseEveryValue] = useState(
        String(pauseEvery)
    );
    const [pauseDuration, setPauseDuration] = useState(
        String(pauseDurationSeconds / 60)
    );

    useEffect(() => {
        if (!sending) {
            setMinInterval(String(minIntervalSeconds));
            setMaxInterval(String(maxIntervalSeconds));
            setPauseEveryValue(String(pauseEvery));
            setPauseDuration(String(pauseDurationSeconds / 60));
        }
    }, [
        minIntervalSeconds,
        maxIntervalSeconds,
        pauseEvery,
        pauseDurationSeconds,
        sending,
    ]);

    const normalizeValue = (value: string) => {
        if (value === "") {
            return "";
        }

        return value.replace(/^0+(?=\d)/, "");
    };

const handleMinIntervalChange = (value: string) => {
    const normalizedValue = normalizeValue(value);

    if (normalizedValue === "") {
        setMinInterval("");
        return;
    }

    const minValue = Number(normalizedValue);

    if (minValue < 1) {
        return;
    }

    setMinInterval(normalizedValue);
    setMinIntervalSeconds(minValue);

    if (minValue > Number(maxInterval)) {
        setMaxInterval(normalizedValue);
        setMaxIntervalSeconds(minValue);
    }
};

const handleMaxIntervalChange = (value: string) => {
    const normalizedValue = normalizeValue(value);

    if (normalizedValue === "") {
        setMaxInterval("");
        return;
    }

    const maxValue = Number(normalizedValue);

    if (maxValue < 1) {
        return;
    }

    setMaxInterval(normalizedValue);
    setMaxIntervalSeconds(maxValue);

    if (maxValue < Number(minInterval)) {
        setMinInterval(normalizedValue);
        setMinIntervalSeconds(maxValue);
    }
};

    const handlePauseEveryChange = (value: string) => {
        const normalizedValue = normalizeValue(value);

        setPauseEveryValue(normalizedValue);
        setPauseEvery(
            normalizedValue === "" ? 0 : Number(normalizedValue)
        );
    };

    const handlePauseDurationChange = (value: string) => {
        const normalizedValue = normalizeValue(value);

        setPauseDuration(normalizedValue);
        setPauseDurationSeconds(
            normalizedValue === "" ? 0 : Number(normalizedValue) * 60
        );
    };



    return (
        <>
            <section className="bg-white p-4">
                <h2 className="mb-4 text-lg font-semibold">
                    Configurações do envio
                </h2>

                <div className="flex gap-10 flex-wrap">
                    <div className="flex flex-col gap-2 border-gray-300 border-2 rounded-lg p-4">
                        <h3 className="text-lg font-semibold">
                            Intervalo entre cada mensagem
                        </h3>

                        <div className="flex gap-x-2 items-center">
                            <span>Intervalo mínimo (segundos)</span>

                            <Input
                                className="block w-20 box-border"
                                type="number"
                                min={0}
                                value={minInterval}
                                disabled={sending}
                                onChange={(event) =>
                                    handleMinIntervalChange(event.target.value)
                                }
                            />
                        </div>

                        <div className="flex gap-2 items-center">
                            <span>Intervalo máximo (segundos)</span>

                            <Input
                                className="block w-20 box-border"
                                type="number"
                                min={minInterval}
                                value={maxInterval}
                                disabled={sending}
                                onChange={(event) =>
                                    handleMaxIntervalChange(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <hr className="border-gray-300" />

                    <div className="flex flex-col gap-2 border-gray-300 border-2 rounded-lg p-4">
                        <h3 className="text-lg font-semibold">
                            Intervalo após envios consecutivos:
                        </h3>

                        <div className="flex gap-2 items-center">
                            <span>Pausar após quantos envios?</span>

                            <Input
                                className="mt-1 block w-20 box-border"
                                type="number"
                                min={1}
                                value={pauseEveryValue}
                                disabled={sending}
                                onChange={(event) =>
                                    handlePauseEveryChange(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="flex gap-2 items-center">
                            <span>Duração da pausa (minutos)</span>

                            <Input
                                className="mt-1 block w-20 box-border"
                                type="number"
                                min={1}
                                value={pauseDuration}
                                disabled={sending}
                                onChange={(event) =>
                                    handlePauseDurationChange(
                                        event.target.value
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>
            </section>

            <hr />
        </>
    );
}