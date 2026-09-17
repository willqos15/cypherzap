import { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Search, Download, AlertCircle } from "lucide-react";
import { Button } from "#components/ui/button";



type Contact = {
    name: string;
    number: string;
};

export default function ExportContacts() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const unsubscribe = window.whatsapp.onContactsCount((total) => {
            setCount(total);
        });

        return unsubscribe;
    }, []);

    async function buscarContatos() {
        try {
            setLoading(true);

            const total = await window.whatsapp.getContactsCount();

            setCount(total);
        } catch (error) {
            console.error("Erro ao buscar contatos:", error);
        } finally {
            setLoading(false);
        }
    }

    async function exportarContatos() {
        try {
            setExporting(true);

            const contacts: Contact[] =
                await window.whatsapp.exportContacts();

            if (contacts.length === 0) {
                return;
            }

            const data = contacts.map((contact) => ({
                Nome: contact.name,
                Número: contact.number,
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Contatos"
            );

            XLSX.writeFile(
                workbook,
                "contatos-whatsapp.xlsx"
            );
        } catch (error) {
            console.error(
                "Erro ao exportar contatos:",
                error
            );
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="bg-white p-4 flex w-full">

            <div className="flex w-full mx-4 flex-col gap-4 rounded-lg border-2 border-gray-300 p-4">

                <h2 className="text-lg font-semibold">
                    Extrair contatos da agenda
                </h2>

                <div className="flex gap-4 items-center">

                    <Button
                        type="button"
                        variant="outline"
                        onClick={buscarContatos}
                        disabled={loading}
                    >
                        <Search className="mr-2 h-4 w-4" />

                        {loading
                            ? "Buscando..."
                            : "Buscar contatos"}
                    </Button>

                    {count > 0 && <span className="text-sm text-muted-foreground">
                        {count}{" "}
                        {count === 1
                            ? "contato encontrado"
                            : "contatos encontrados"}
                    </span>}
                </div>



                {count > 0 && (
                    <>


                        <Button
                            type="button"
                            variant="secondary"
                            onClick={exportarContatos}
                            disabled={exporting}
                            className="w-full"
                        >
                            <Download className="mr-2 h-4 w-4" />

                            {exporting
                                ? "Exportando..."
                                : "Exportar"}
                        </Button>
                    </>
                )}

<div className="bg-yellow-100 rounded-xl p-2 flex gap-2 items-center">
                <AlertCircle size={20}/> Os números podem demorar para aparecer devido a sincronização do WhatsApp.

            </div>

            </div>

            
        </div>
    );
}