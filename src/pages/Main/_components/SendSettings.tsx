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
    return (
        <>
            <section className=" bg-white p-4">
                <h2 className="mb-4 text-lg font-semibold">
                    Configurações do envio
                </h2>

                <div className="flex gap-10">

                    <div className="flex flex-col gap-2 border-gray-300 border-2 rounded-lg p-4">
                        <h3 className="text-lg font-semibold">
                            Intervalo entre cada mensagem
                        </h3>

                        <div className="flex gap-x-2 items-center">
                            <span>Intervalo mínimo (segundos)</span>
                            <Input
                                className="block w-20 box-border"
                                type="number" min={0}
                                value={minIntervalSeconds}
                                disabled={sending}
                                onChange={(event) =>
                                    setMinIntervalSeconds(Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="flex gap-2 items-center">

                            <span>Intervalo máximo (segundos)</span>

                            <Input
                                className="block w-20 box-border"
                                type="number"
                                min={0}
                                value={maxIntervalSeconds}
                                disabled={sending}
                                onChange={(event) =>
                                    setMaxIntervalSeconds(Number(event.target.value))
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
                                value={pauseEvery}
                                disabled={sending}
                                onChange={(event) =>
                                    setPauseEvery(Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="flex gap-2 items-center">


                            <span>Duração da pausa (segundos)</span>

                            <Input
                                className="mt-1 block w-20 box-border"
                                type="number"
                                min={0}
                                value={pauseDurationSeconds}
                                disabled={sending}
                                onChange={(event) =>
                                    setPauseDurationSeconds(Number(event.target.value))
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