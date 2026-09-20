import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

export type DateFilter = {
    type: "all" | "day" | "range";
    startDate: string;
    endDate: string;
};

type Props = {
    onFilterChange: (filter: DateFilter) => void;
};

export default function HistoryDateFilter({
    onFilterChange,
}: Props) {
    const [type, setType] = useState<DateFilter["type"]>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    function atualizarFiltro(
        novoTipo: DateFilter["type"],
        novaDataInicial = startDate,
        novaDataFinal = endDate
    ) {
        onFilterChange({
            type: novoTipo,
            startDate: novaDataInicial,
            endDate: novaDataFinal,
        });
    }

    function handleTypeChange(
        novoTipo: DateFilter["type"]
    ) {
        setType(novoTipo);

        if (novoTipo === "all") {
            setStartDate("");
            setEndDate("");

            atualizarFiltro("all", "", "");
        }

        if (novoTipo === "day") {
            setEndDate("");

            atualizarFiltro("day", startDate, "");
        }

        if (novoTipo === "range") {
            atualizarFiltro("range", startDate, endDate);
        }
    }

    function handleStartDateChange(value: string) {
        setStartDate(value);

        atualizarFiltro(type, value, endDate);
    }

    function handleEndDateChange(value: string) {
        setEndDate(value);

        atualizarFiltro(type, startDate, value);
    }

    function limparFiltro() {
        setType("all");
        setStartDate("");
        setEndDate("");

        atualizarFiltro("all", "", "");
    }

    return (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <CalendarDays
                        size={18}
                        className="text-gray-600"
                    />

                    <span className="text-sm font-medium text-gray-700">
                        Filtrar por data
                    </span>
                </div>

                <select
                    value={type}
                    onChange={(e) =>
                        handleTypeChange(
                            e.target.value as DateFilter["type"]
                        )
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="all">
                        Todos os períodos
                    </option>

                    <option value="day">
                        Um dia
                    </option>

                    <option value="range">
                        Intervalo
                    </option>
                </select>

                {type === "day" && (
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                            handleStartDateChange(e.target.value)
                        }
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    />
                )}

                {type === "range" && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                De
                            </span>

                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) =>
                                    handleStartDateChange(
                                        e.target.value
                                    )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Até
                            </span>

                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) =>
                                    handleEndDateChange(
                                        e.target.value
                                    )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                            />
                        </div>
                    </>
                )}

                {type !== "all" && (
                    <button
                        type="button"
                        onClick={limparFiltro}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition"
                    >
                        <X size={16} />
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
}