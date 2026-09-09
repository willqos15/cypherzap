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
    className: string;
};

export default function ExportReportButton({
    results, className
}: ExportReportButtonProps) {
    const exportReport = () => {
        if (results.length === 0) {
            return;
        }

        // =========================
        // RESUMO
        // =========================

        const total = results.length;

        const successCount = results.filter(
            (result) => result.status === "success"
        ).length;

        const failedCount = results.filter(
            (result) => result.status === "failed"
        ).length;

        // =========================
        // DADOS DA PLANILHA
        // =========================

        const data = results.map((result, index) => ({
            "#": index + 1,

            Número: result.number,

            Status:
                result.status === "success"
                    ? "Sucesso"
                    : "Falha",

            "Data/Hora": result.sentAt.toLocaleString(
                "pt-BR"
            ),

            Mensagem: result.messageToSend ?? "",

            Erro: result.error ?? "",
        }));

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
            { wch: 12 },
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
        });
    };

    if (results.length === 0) {
        return null;
    }

    return (
        <Button
            type="button"
            onClick={exportReport}
            variant="secondary"
            className={`font-bold ${className}`}
        >

            <FileChartColumnIncreasing />
            Exportar relatório
        </Button>
    );
}

