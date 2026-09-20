import { Download } from "lucide-react";

import * as XLSX from "xlsx";

import type { HistoricoEnvio } from "../../../../types/HistoricoEnvio";

import { Button } from "#components/ui/button";

type ExportHistoryButtonProps = {
    envios: HistoricoEnvio[];
    className?: string;
    title?: string;
};

export default function ExportHistoryButton({
    envios,
    className,
    title,
}: ExportHistoryButtonProps) {

    function formatarData(data: string) {
        const date = new Date(data);

        if (Number.isNaN(date.getTime())) {
            return data;
        }

        return date.toLocaleString("pt-BR");
    }

    const exportHistory = () => {
        if (envios.length === 0) {
            return;
        }

        const data = envios.map((envio, index) => ({
            "#": index + 1,
            "Lista ID": envio.lista_id,
            Número: envio.numero,
            Status: envio.status,
            "Data/Hora": envio.data_hora
                ? formatarData(envio.data_hora)
                : "",
            Mensagem: envio.mensagem ?? "",
            Erro: envio.erro ?? "",
        }));

        const worksheet =
            XLSX.utils.json_to_sheet(data);

        worksheet["!cols"] = [
            { wch: 6 },
            { wch: 38 },
            { wch: 20 },
            { wch: 18 },
            { wch: 22 },
            { wch: 60 },
            { wch: 40 },
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Histórico"
        );

        const date = new Date();

        const dateString = date
            .toLocaleDateString("pt-BR")
            .replace(/\//g, "-");

        const timeString = date
            .toLocaleTimeString("pt-BR")
            .replace(/:/g, "-");

        const fileName =
            `historico-envios-${dateString}-${timeString}.xlsx`;

        XLSX.writeFile(
            workbook,
            fileName
        );
    };

    if (envios.length === 0) {
        return null;
    }

    return (
        <Button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                exportHistory();
            }}
            variant="secondary"
            className={`font-bold ${className ?? ""}`}
        >
            <Download className="h-4 w-4" />
            {title}
        </Button>
    );
}