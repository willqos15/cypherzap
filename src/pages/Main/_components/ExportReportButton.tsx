import { FileChartColumnIncreasing } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "../../../components/ui/button";

type SendResult = {
number: string;
status: "success" | "failed";
sentAt: Date;
messageToSend?: string;
error?: string;
};

type ExportReportButtonProps = {
results: SendResult[];
numbers: string[];
className?: string;
};

export default function ExportReportButton({
results,
numbers,
className,
}: ExportReportButtonProps) {

const exportReport = () => {
    if (numbers.length === 0) {
        return;
    }

    // =========================
    // RESUMO
    // =========================

    const total = numbers.length;

    const successCount = results.filter(
        (result) => result.status === "success"
    ).length;

    const failedCount = results.filter(
        (result) => result.status === "failed"
    ).length;

    const waitingCount = numbers.filter(
        (number) =>
            !results.some(
                (result) => result.number === number
            )
    ).length;

    // =========================
    // MAPA DE RESULTADOS
    // =========================

    const resultsMap = new Map(
        results.map((result) => [
            result.number,
            result,
        ])
    );

    // =========================
    // DADOS DA PLANILHA
    // =========================

    const data = numbers.map((number, index) => {

        const result = resultsMap.get(number);

        // Número ainda não enviado
        if (!result) {
            return {
                "#": index + 1,
                Número: number,
                Status: "Espera em fila",
                "Data/Hora": "",
                Mensagem: "",
                Erro: "",
            };
        }

        // Número enviado
        return {
            "#": index + 1,
            Número: result.number,

            Status:
                result.status === "success"
                    ? "Sucesso"
                    : "Falha",

            "Data/Hora":
                result.sentAt.toLocaleString("pt-BR"),

            Mensagem:
                result.messageToSend ?? "",

            Erro:
                result.error ?? "",
        };
    });

    // =========================
    // CRIA PLANILHA
    // =========================

    const worksheet =
        XLSX.utils.json_to_sheet(data);

    // =========================
    // LARGURA DAS COLUNAS
    // =========================

    worksheet["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 60 },
        { wch: 40 },
    ];

    // =========================
    // CRIA WORKBOOK
    // =========================

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Relatório"
    );

    // =========================
    // NOME DO ARQUIVO
    // =========================

    const date = new Date();

    const dateString = date
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");

    const timeString = date
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-");

    const fileName =
        `relatorio-envio-${dateString}-${timeString}.xlsx`;

    // =========================
    // EXPORTA
    // =========================

    XLSX.writeFile(
        workbook,
        fileName
    );

    console.log("Relatório exportado:", {
        total,
        successCount,
        failedCount,
        waitingCount,
    });
};

if (numbers.length === 0) {
    return null;
}

return (
    <Button
        type="button"
        onClick={exportReport}
        variant="secondary"
        className={`font-bold ${className ?? ""}`}
    >
        <FileChartColumnIncreasing />
        Exportar relatório
    </Button>
);


}
