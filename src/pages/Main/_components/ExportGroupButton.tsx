import { Download } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

type GroupContact = {
    name: string;
    number: string;
};

type Props = {
    groupId: string;
    groupTitle: string;
    disabled?: boolean;
};

export function ExportGroupButton({
    groupId,
    groupTitle,
    disabled = false,
}: Props) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!groupId) return;

        try {
            setIsExporting(true);

            const contacts: GroupContact[] =
    groupId === "ALL"
        ? await window.whatsapp.exportAllGroupNumbers()
        : await window.whatsapp.exportGroupNumbers(groupId);

            const disponiveis = contacts.filter(
    (contact) =>
        !contact.number.startsWith("Número indisponível")
);

const indisponiveis = contacts.filter(
    (contact) =>
        contact.number.startsWith("Número indisponível")
);

const contatosOrdenados = [
    ...disponiveis,
    ...indisponiveis,
];

const worksheet = XLSX.utils.json_to_sheet(
    contatosOrdenados.map((contact) => ({
        Nome: contact.name,
        Número: contact.number,
    }))
);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Contatos"
            );

            XLSX.writeFile(
                workbook,
                `${groupTitle}.xlsx`
            );
        } catch (error) {
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={disabled || isExporting}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <Download className="h-4 w-4" />

            {isExporting
                ? "Exportando..."
                : "Exportar números"}
        </button>
    );
}