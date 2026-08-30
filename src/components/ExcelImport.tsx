import {
useRef,
useState
} from "react";

import * as XLSX from "xlsx";

type ExcelImportProps = {
numbers: string[];

onNumbersChange: (
numbers: string[]
) => void;
};

function ExcelImport({
numbers,
onNumbersChange
}: ExcelImportProps) {

const [loading, setLoading] =
useState(false);

const [result, setResult] =
useState("");

const fileInputRef =
useRef<HTMLInputElement>(null);

function cleanNumber(
value: string
) {
return value.replace(/\D/g, "");
}

async function handleFileChange(
event: React.ChangeEvent<HTMLInputElement>
) {


const file =
  event.target.files?.[0];

if (!file) {
  return;
}

try {

  setLoading(true);
  setResult("");

  const buffer =
    await file.arrayBuffer();

  const workbook =
    XLSX.read(buffer, {
      type: "array"
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
    XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        defval: ""
      }
    );

  if (rows.length === 0) {
    throw new Error(
      "A planilha está vazia."
    );
  }

  const importedNumbers: string[] = [];

  let invalid = 0;
  let duplicates = 0;

  /*
   * Números que já existem
   * na lista atual.
   */
  const existingNumbers =
    new Set(numbers);

  /*
   * Números encontrados
   * durante a importação.
   */
  const importedSet =
    new Set<string>();

  /*
   * Percorre todas as linhas.
   */
  rows.forEach((row) => {

    if (!Array.isArray(row)) {
      return;
    }

    row.forEach((cell) => {

      if (
        cell === null ||
        cell === undefined ||
        cell === ""
      ) {
        return;
      }

      const rawValue =
        String(cell).trim();

      /*
       * Remove tudo que não
       * for número.
       */
      const clean =
        cleanNumber(rawValue);

      /*
       * Ignora células que
       * não possuem números.
       */
      if (!clean) {
        return;
      }

      /*
       * Validação mínima.
       *
       * Brasil:
       * 55 + DDD + número
       *
       * Normalmente teremos
       * 12 ou 13 dígitos.
       */
      if (clean.length < 10) {
        invalid++;
        return;
      }

      /*
       * Número já existente
       * na lista.
       */
      if (
        existingNumbers.has(clean)
      ) {
        duplicates++;
        return;
      }

      /*
       * Número duplicado
       * dentro do próprio arquivo.
       */
      if (
        importedSet.has(clean)
      ) {
        duplicates++;
        return;
      }

      importedSet.add(clean);

      importedNumbers.push(clean);
    });
  });

  /*
   * Nenhum número novo.
   */
  if (
    importedNumbers.length === 0
  ) {

    setResult(
      `⚠️ Nenhum novo número encontrado. ` +
      `Duplicados: ${duplicates}. ` +
      `Inválidos: ${invalid}.`
    );

    return;
  }

  /*
   * Mantém os números atuais
   * e adiciona os importados.
   */
  onNumbersChange([
    ...numbers,
    ...importedNumbers
  ]);

  setResult(
    `✅ ${importedNumbers.length} números adicionados. ` +
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

  /*
   * Permite selecionar
   * o mesmo arquivo novamente.
   */
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}


}

return ( <section>


  <h2>
    Importar números
  </h2>

  <input
    ref={fileInputRef}
    type="file"
    accept=".xlsx,.xls,.csv"
    onChange={handleFileChange}
    disabled={loading}
  />

  {loading && (
    <p>
      ⏳ Importando números...
    </p>
  )}

  {result && (
    <p>
      {result}
    </p>
  )}

</section>


);
}

export default ExcelImport;
