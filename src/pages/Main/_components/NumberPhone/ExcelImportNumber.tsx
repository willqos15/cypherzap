import { useRef, useState } from "react";

import * as XLSX from "xlsx";

import { Button } from "../../../../components/ui/button";

import { Contact, X } from "lucide-react";

import { normalizePhone } from "#lib/utils";

type ExcelImportProps = {
  numbers: string[];

  onNumbersChange: (numbers: string[]) => void;
};

type ExcelRow = unknown[];

export default function ExcelImportNumber({
  numbers,
  onNumbersChange,
}: ExcelImportProps) {
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  /*
   * Guarda apenas os números adicionados
   * pela importação atual.
   *
   * Isso permite trocar de coluna sem apagar
   * números adicionados manualmente.
   */
  const [importedNumbers, setImportedNumbers] =
    useState<string[]>([]);

  /*
   * Cabeçalhos encontrados no Excel.
   */
  const [headers, setHeaders] = useState<string[]>([]);

  /*
   * Todas as linhas do Excel.
   */
  const [excelRows, setExcelRows] =
    useState<ExcelRow[]>([]);

  /*
   * Índice da coluna atualmente selecionada.
   */
  const [selectedColumn, setSelectedColumn] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * ==========================================
   * NORMALIZA O NOME DO CABEÇALHO
   * ==========================================
   *
   * Exemplos:
   *
   * NÚMERO -> numero
   * Número -> numero
   * NUMEROS -> numeros
   * CONTATOS -> contatos
   */
  function normalizeHeader(value: unknown) {
    return String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /*
   * ==========================================
   * PALAVRAS-CHAVE PARA DETECTAR A COLUNA
   * ==========================================
   */
  function isPhoneColumn(header: unknown) {
    const normalized = normalizeHeader(header);

    const phoneKeywords = [
      "numero",
      "numeros",
      "telefone",
      "telefones",
      "celular",
      "celulares",
      "whatsapp",
      "contato",
      "contatos",
      "fone",
      "fones",
    ];

    return phoneKeywords.includes(normalized);
  }

  /*
   * ==========================================
   * REMOVE A IMPORTAÇÃO ANTERIOR
   * ==========================================
   *
   * Quando o usuário troca a coluna,
   * os números importados anteriormente
   * precisam sair da lista.
   */
  function getNumbersWithoutPreviousImport() {
    const previousImportedSet = new Set(
      importedNumbers.map((number) =>
        normalizePhone(number)
      )
    );

    return numbers.filter((number) => {
      const normalized = normalizePhone(number);

      return !previousImportedSet.has(normalized);
    });
  }

  /*
   * ==========================================
   * PROCESSA UMA COLUNA DO EXCEL
   * ==========================================
   */
  function importNumbersFromColumn(
    columnIndex: number,
    rows: ExcelRow[]
  ) {
    /*
     * Remove somente os números que vieram
     * da importação anterior.
     */
    const baseNumbers =
      getNumbersWithoutPreviousImport();

    /*
     * Números que já existiam antes
     * da importação atual.
     */
    const existingNumbers = new Set(
      baseNumbers
        .map((number) =>
          normalizePhone(number)
        )
        .filter(Boolean)
    );

    /*
     * Números encontrados nesta nova coluna.
     */
    const importedSet = new Set<string>();

    const newImportedNumbers: string[] = [];

    let invalid = 0;

    let duplicates = 0;

    /*
     * Começa em 1 porque a linha 0
     * é o cabeçalho.
     */
    for (
      let rowIndex = 1;
      rowIndex < rows.length;
      rowIndex++
    ) {
      const row = rows[rowIndex];

      if (!Array.isArray(row)) {
        continue;
      }

      const cell = row[columnIndex];

      /*
       * Célula vazia não é inválida.
       */
      if (
        cell === null ||
        cell === undefined ||
        cell === ""
      ) {
        continue;
      }

      const normalized = normalizePhone(cell);

      /*
       * Se não conseguiu normalizar,
       * considera inválido.
       */
      if (!normalized) {
        invalid++;

        continue;
      }

      /*
       * Já existe na lista antes
       * da importação.
       */
      if (existingNumbers.has(normalized)) {
        duplicates++;

        continue;
      }

      /*
       * Está repetido dentro
       * do próprio Excel.
       */
      if (importedSet.has(normalized)) {
        duplicates++;

        continue;
      }

      /*
       * Brasil:
       *
       * 55 + DDD + telefone
       *
       * Fixo: 12 dígitos
       * Celular: 13 dígitos
       */
      if (
        normalized.length !== 12 &&
        normalized.length !== 13
      ) {
        invalid++;

        continue;
      }

      importedSet.add(normalized);

      newImportedNumbers.push(normalized);
    }

    /*
     * Atualiza a lista principal.
     *
     * Mantém:
     * - números adicionados manualmente
     *
     * Troca:
     * - números da importação anterior
     */
    onNumbersChange([
      ...baseNumbers,
      ...newImportedNumbers,
    ]);

    /*
     * Guarda a nova importação.
     */
    setImportedNumbers(newImportedNumbers);

    /*
     * Mostra resultado.
     */
    if (newImportedNumbers.length === 0) {
      setResult(
        `⚠️ Nenhum novo número encontrado. ` +
          `Duplicados: ${duplicates}. ` +
          `Inválidos: ${invalid}.`
      );

      return;
    }

    setResult(
      `${newImportedNumbers.length} número${
        newImportedNumbers.length !== 1
          ? "s"
          : ""
      } importado${
        newImportedNumbers.length !== 1
          ? "s"
          : ""
      }. ` +
        `Duplicados: ${duplicates}. ` +
        `Inválidos: ${invalid}.`
    );
  }

  /*
   * ==========================================
   * IMPORTAÇÃO DO ARQUIVO
   * ==========================================
   */
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

      /*
       * Limpa dados da importação anterior.
       */
      setImportedNumbers([]);

      setHeaders([]);

      setExcelRows([]);

      setSelectedColumn("");

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        raw: true,
      });

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "Nenhuma planilha encontrada."
        );
      }

      const worksheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json<ExcelRow>(
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
       * Primeira linha = cabeçalhos.
       */
      const headerRow = rows[0];

      if (!Array.isArray(headerRow)) {
        throw new Error(
          "Cabeçalho da planilha inválido."
        );
      }

      /*
       * Cria os nomes que aparecerão
       * dentro do select.
       */
      const columnHeaders = headerRow.map(
        (header, index) => {
          const value = String(header).trim();

          /*
           * Caso exista uma coluna sem nome.
           */
          return value || `Coluna ${index + 1}`;
        }
      );

      /*
       * Guarda o Excel inteiro.
       */
      setExcelRows(rows);

      /*
       * Guarda os cabeçalhos.
       */
      setHeaders(columnHeaders);

      /*
       * ========================================
       * PROCURA AUTOMATICAMENTE A COLUNA
       * ========================================
       */
      const detectedColumnIndex =
        headerRow.findIndex(isPhoneColumn);

      /*
       * Se encontrou uma coluna conhecida:
       *
       * - seleciona automaticamente
       * - importa os números
       */
      if (detectedColumnIndex !== -1) {
        setSelectedColumn(
          String(detectedColumnIndex)
        );

        importNumbersFromColumn(
          detectedColumnIndex,
          rows
        );

        return;
      }

      /*
       * ========================================
       * NÃO ENCONTROU NENHUM NOME CONHECIDO
       * ========================================
       *
       * Mostra o select para o usuário escolher.
       */
      setResult(
        "⚠️ Não encontrei automaticamente uma coluna de contatos. Selecione uma coluna."
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

      /*
       * Permite selecionar novamente
       * o mesmo arquivo.
       */
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  /*
   * ==========================================
   * USUÁRIO TROCOU A COLUNA
   * ==========================================
   */
  function handleColumnChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = event.target.value;

    const columnIndex = Number(value);

    setSelectedColumn(value);

    /*
     * Reprocessa usando a nova coluna.
     */
    importNumbersFromColumn(
      columnIndex,
      excelRows
    );
  }

  /*
   * ==========================================
   * CANCELAR IMPORTAÇÃO
   * ==========================================
   */
  function handleCancelImport() {
    if (importedNumbers.length === 0) {
      return;
    }

    const importedSet = new Set(
      importedNumbers.map((number) =>
        normalizePhone(number)
      )
    );

    const remainingNumbers = numbers.filter(
      (number) => {
        const normalized =
          normalizePhone(number);

        return !importedSet.has(normalized);
      }
    );

    onNumbersChange(remainingNumbers);

    setImportedNumbers([]);

    setSelectedFile(null);

    setHeaders([]);

    setExcelRows([]);

    setSelectedColumn("");

    setResult("Importação cancelada.");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-2">
      {/* INPUT ESCONDIDO */}

      <input
        className="hidden"
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={loading}
      />

      {/* BOTÃO IMPORTAR */}

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

      {/* SELECT DAS COLUNAS */}

      {selectedFile &&
        headers.length > 0 && (
          <select
            value={selectedColumn}
            onChange={handleColumnChange}
            disabled={loading}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Selecione a coluna
            </option>

            {headers.map(
              (header, index) => (
                <option
                  key={`${header}-${index}`}
                  value={index}
                >
                  {header}
                </option>
              )
            )}
          </select>
        )}

      {/* CANCELAR */}

      {selectedFile &&
        importedNumbers.length > 0 && (
          <Button
            variant="delete"
            type="button"
            onClick={handleCancelImport}
            disabled={loading}
          >
            <X />
          </Button>
        )}

      {/* LOADING */}

      {loading && (
        <p className="px-1 text-sm text-gray-700">
          Importando números...
        </p>
      )}

      {/* RESULTADO */}

      {result && (
        <p className="px-1 text-sm text-gray-700">
          {result}
        </p>
      )}
    </section>
  );
}