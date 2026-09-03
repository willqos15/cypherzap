import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/button";
import { Contact, X } from "lucide-react";
import { normalizePhone } from "#lib/utils";

type ExcelImportProps = {
  numbers: string[];
  onNumbersChange: (numbers: string[]) => void;
};

export default function ExcelImportNumber({
  numbers,
  onNumbersChange,
}: ExcelImportProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedNumbers, setImportedNumbers] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setSelectedFile(file);
      setLoading(true);
      setResult("");

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        raw: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "Nenhuma planilha encontrada."
        );
      }

      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<unknown[]>(
        worksheet,
        {
          header: 1,
          defval: "",
          raw: true,
        }
      );

      if (rows.length === 0) {
        throw new Error(
          "A planilha está vazia."
        );
      }

      /*
       * ==========================================
       * LOCALIZA A COLUNA "NUMERO"
       * ==========================================
       */

      const headerRow = rows[0];

      if (!Array.isArray(headerRow)) {
        throw new Error(
          "Cabeçalho da planilha inválido."
        );
      }

      const numberColumnIndex =
        headerRow.findIndex((header) => {
          const normalizedHeader = String(header)
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          return (
            normalizedHeader === "numero" ||
            normalizedHeader === "telefone" ||
            normalizedHeader === "celular" ||
            normalizedHeader === "whatsapp"
          );
        });

      if (numberColumnIndex === -1) {
        throw new Error(
          'Não encontrei uma coluna "numero", "telefone", "celular" ou "whatsapp" na planilha.'
        );
      }

      /*
       * ==========================================
       * CONTADORES
       * ==========================================
       */

      const importedNumbers: string[] = [];

      let invalid = 0;
      let duplicates = 0;

      /*
       * Normaliza os números que já estão
       * na lista atual.
       */
      const existingNumbers = new Set(
        numbers
          .map((number) =>
            normalizePhone(number)

          )
          .filter(Boolean)
      );

      /*
       * Números encontrados dentro
       * do próprio Excel.
       */
      const importedSet = new Set<string>();

      /*
       * ==========================================
       * PROCESSA SOMENTE A COLUNA DE NÚMEROS
       * ==========================================
       *
       * A coluna "nome" não é processada.
       *
       * Portanto:
       *
       * William 55
       *
       * nunca será transformado em:
       *
       * 55
       *
       * e nunca será contabilizado como inválido.
       */

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];

        if (!Array.isArray(row)) {
          continue;
        }

        const cell = row[numberColumnIndex];

        if (
          cell === null ||
          cell === undefined ||
          cell === ""
        ) {
          continue;
        }

        const normalized =
          normalizePhone(cell);

        if (!normalized) {
          continue;
        }

        /*
         * ========================================
         * PRIMEIRO: DUPLICADO
         * ========================================
         */

        if (existingNumbers.has(normalized)) {
          duplicates++;
          continue;
        }

        /*
         * ========================================
         * DUPLICADO DENTRO DO PRÓPRIO ARQUIVO
         * ========================================
         */

        if (importedSet.has(normalized)) {
          duplicates++;
          continue;
        }

        /*
         * ========================================
         * VALIDAÇÃO
         * ========================================
         *
         * 55 + DDD + telefone
         *
         * Celular:
         * 13 dígitos
         *
         * Fixo:
         * 12 dígitos
         */

        if (
          normalized.length !== 12 &&
          normalized.length !== 13
        ) {
          invalid++;
          continue;
        }

        /*
         * ========================================
         * NÚMERO NOVO E VÁLIDO
         * ========================================
         */

        importedSet.add(normalized);
        importedNumbers.push(normalized);
      }

      /*
       * ==========================================
       * NENHUM NOVO
       * ==========================================
       */

      if (importedNumbers.length === 0) {
        setResult(
          `⚠️ Nenhum novo número encontrado. ` +
          `Duplicados: ${duplicates}. ` +
          `Inválidos: ${invalid}.`
        );

        return;
      }

      /*
       * ==========================================
       * ADICIONA OS NOVOS
       * ==========================================
       */

      onNumbersChange([
        ...numbers,
        ...importedNumbers,
      ]);

      setImportedNumbers(importedNumbers);

      setResult(
        `${importedNumbers.length} número${importedNumbers.length !== 1
          ? "s"
          : ""
        } importado${importedNumbers.length !== 1
          ? "s"
          : ""
        }. ` +
        `Duplicados: ${duplicates}. ` +
        `Inválidos: ${invalid}.`
      );
    } catch (error) {
      console.error(
        "Erro ao importar arquivo:",
        error
      );

      setResult(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Erro ao importar arquivo."
      );
    } finally {
      setLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }




  function handleCancelImport() {
    if (importedNumbers.length === 0) {
      return;
    }

    const importedSet = new Set(importedNumbers);

    const remainingNumbers = numbers.filter(
      (number) => !importedSet.has(normalizePhone(number))
    );

    onNumbersChange(remainingNumbers);

    setImportedNumbers([]);
    setSelectedFile(null);
    setResult("Importação cancelada.");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="flex items-center gap-2">

      <input
        className="hidden"
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={loading}
      />

      <Button
        variant="secondary"
        type="button"
        onClick={() =>
          fileInputRef.current?.click()
        }
        disabled={loading}
        className="rounded-md border px-4 py-2 disabled:opacity-50"
      >
        <Contact />

        {selectedFile
          ? selectedFile.name
          : "Importar Lista de Números"}
      </Button>

      {selectedFile && importedNumbers.length > 0 && (
        <Button
          variant="delete"
          type="button"
          onClick={handleCancelImport}
          disabled={loading}>
          <X />
        </Button>
      )}

      {loading && (
        <p className="px-1 text-gray-700 text-sm">
          Importando números...
        </p>
      )}

      {result && (
        <p className="px-1 text-gray-700 text-sm">
          {result}
        </p>
      )}



    </section>
  );
}