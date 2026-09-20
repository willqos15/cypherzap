import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    XCircle,
} from "lucide-react";
import type { HistoricoEnvio } from "../../../../types/HistoricoEnvio";
import { formatNumber } from "#lib/utils";
import ExportHistoryButton from "./ExportHistoryButton";



type SendList = {
    listaId: string;
    dataHora: string;
    envios: HistoricoEnvio[];
};

type Props = {
    refreshKey: number;
};

export default function SendHistory({
    refreshKey,
}: Props) {
    const [envios, setEnvios] = useState<
        HistoricoEnvio[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] = useState<
        string | null
    >(null);

    const [expandedLists, setExpandedLists] =
        useState<Set<string>>(new Set());

    // =========================
    // CARREGAR HISTÓRICO
    // =========================

useEffect(() => {
    async function carregarHistorico() {
        try {
            setError(null);

            const resultado =
                await window.whatsapp.obterHistoricoEnvios();

            setEnvios(resultado);
        } catch (error) {
            console.error(
                "Erro ao carregar histórico:",
                error
            );

            setError(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar histórico."
            );
        } finally {
            setLoading(false);
        }
    }

    carregarHistorico();

    const removerListener =
        window.whatsapp.onHistoricoEnvioAtualizado(() => {
            carregarHistorico();
        });

    return () => {
        removerListener();
    };
}, [refreshKey]);

    // =========================
    // AGRUPAR POR LISTA
    // =========================

    const listas = useMemo<SendList[]>(() => {
        const agrupadas = new Map<
            string,
            SendList
        >();

        for (const envio of envios) {
            const listaExistente =
                agrupadas.get(envio.lista_id);

            if (listaExistente) {
                listaExistente.envios.push(envio);
            } else {
                agrupadas.set(envio.lista_id, {
                    listaId: envio.lista_id,
                    dataHora: envio.data_hora,
                    envios: [envio],
                });
            }
        }

        return Array.from(agrupadas.values());
    }, [envios]);

        const todosEnvios = useMemo(
        () => listas.flatMap((lista) => lista.envios),
        [listas]
    );

    // =========================
    // EXPANDIR / FECHAR
    // =========================

    function alternarLista(listaId: string) {
        setExpandedLists((prev) => {
            const novo = new Set(prev);

            if (novo.has(listaId)) {
                novo.delete(listaId);
            } else {
                novo.add(listaId);
            }

            return novo;
        });
    }

    // =========================
    // DATA
    // =========================

   function formatarData(data: string) {
    const date = new Date(data);

    if (Number.isNaN(date.getTime())) {
        return data;
    }

    return date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
    });
}

    // =========================
    // LOADING
    // =========================

    if (loading) {
        return (
            <section className="bg-white border-gray-300 border-2 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock
                        size={18}
                        className="animate-pulse"
                    />

                    <span>
                        Carregando histórico...
                    </span>
                </div>
            </section>
        );
    }

    // =========================
    // ERRO
    // =========================

    if (error) {
        return (
            <section className="bg-white border-red-300 border-2 rounded-lg p-4">
                <p className="text-red-600">
                    {error}
                </p>
            </section>
        );
    }

    // =========================
    // VAZIO
    // =========================

    if (listas.length === 0) {
        return (
            <section className="bg-white border-gray-300 border-2 rounded-lg p-4">
                <p className="text-gray-500 text-center py-6">
                    Nenhum envio realizado ainda.
                </p>
            </section>
        );
    }

    // =========================
    // LISTAS
    // =========================



    return (
        <section className="bg-white border-gray-300 border-2 rounded-lg p-4 flex flex-col gap-3">
            <div>

                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">
                        Histórico de envios
                    </h2>


                    <ExportHistoryButton
                        title="Exportar Todos Envios"
                        envios={todosEnvios} />
                </div>

                <p className="text-sm text-gray-500">
                    {listas.length}{" "}
                    {listas.length === 1
                        ? "lista enviada"
                        : "listas enviadas"}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {listas.map((lista) => {
                    const aberta =
                        expandedLists.has(
                            lista.listaId
                        );

                    const total =
                        lista.envios.length;

                    const sucessos =
                        lista.envios.filter(
                            (envio) =>
                                envio.status ===
                                "Sucesso"
                        ).length;

                    const erros =
                        lista.envios.filter(
                            (envio) =>
                                envio.status === "Falha"
                        ).length;

                    return (
                        <div
                            key={lista.listaId}
                            className="border border-gray-300 rounded-lg overflow-hidden m-4"
                        >
                            {/* CABEÇALHO DA LISTA */}

                            <button
                                type="button"
                                onClick={() =>
                                    alternarLista(
                                        lista.listaId
                                    )
                                }
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    {aberta ? (
                                        <ChevronDown
                                            size={20}
                                        />
                                    ) : (
                                        <ChevronRight
                                            size={20}
                                        />
                                    )}

                                    <div className="text-left flex gap-4 items-center">
                                        <p className="font-medium">
                                            Envio {formatarData(
                                                lista.dataHora
                                            )}
                                        </p>

                                        <ExportHistoryButton
                                            title="Exportar"
                                            envios={lista.envios} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                        {total}{" "}
                                        {total === 1
                                            ? "envio"
                                            : "envios"}
                                    </span>

                                    <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle2
                                            size={16}
                                        />

                                        {sucessos}
                                    </span>

                                    {erros > 0 && (
                                        <span className="flex items-center gap-1 text-red-600">
                                            <XCircle
                                                size={16}
                                            />

                                            {erros}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* ENVIO DA LISTA */}

                            {aberta && (
                                <div className="border-t border-gray-200">
                                    {/* CABEÇALHO DA TABELA */}
                                    <div className="grid grid-cols-[1.5fr_1.2fr_3fr_1fr] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
                                        <span>Número</span>
                                        <span>Data/Hora</span>
                                        <span>Mensagem</span>
                                        <span>Status</span>
                                    </div>

                                    {/* LINHAS */}
                                    {lista.envios.map((envio) => (
                                        <div
                                            key={envio.id}
                                            className="grid grid-cols-[1.5fr_1.2fr_3fr_1fr] gap-4 px-4 py-3 border-b last:border-b-0 border-gray-100 items-center text-sm"
                                        >
                                            {/* NÚMERO */}
                                            <div className="min-w-0">
                                                <p className="font-medium break-all">
                                                    {formatNumber(envio.numero)}
                                                </p>
                                            </div>

                                            {/* DATA */}
                                            <div className="text-gray-500">
                                                {formatarData(envio.data_hora)}
                                            </div>

                                            {/* MENSAGEM */}
                                            <div className="min-w-0">
                                                {envio.mensagem ? (
                                                    <p className="text-gray-600 wrap-break-word">
                                                        {envio.mensagem}
                                                    </p>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        —
                                                    </span>
                                                )}

                                                {envio.erro && (
                                                    <p className="text-red-600 mt-1 wrap-break-word">
                                                        {envio.erro}
                                                    </p>
                                                )}
                                            </div>

                                            {/* STATUS */}
                                            <div>
                                                {envio.status === "Sucesso" ? (
                                                    <span className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle2 size={16} />
                                                        Sucesso
                                                    </span>
                                                ) : envio.status === "Falha" ? (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <XCircle size={16} />
                                                        Erro
                                                    </span>
                                                ) : envio.status === "Espera em fila" ? (
                                                    <span className="flex items-center gap-1 text-yellow-600">
                                                        <Clock size={16} />
                                                        Em fila
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-gray-500">
                                                        <XCircle size={16} />
                                                 {envio.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}