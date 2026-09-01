import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import * as XLSX from "xlsx";
import type { MessageModel } from "../../../../types/MessageModel";
import { Button } from "../../../../components/ui/button";
import { Import } from "lucide-react";
import { toast } from "sonner";

type PreviewRow = {
  titulo: string;
  textos: string[];
};

type Props = {
  models: MessageModel[];
  onModelsChange: (models: MessageModel[]) => void;
  openModelSelect: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MessageModelImport({
  models,
  onModelsChange,
  openModelSelect,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // =========================
  // CONVERTER VALOR
  // =========================

  function valueToString(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  // =========================
  // NORMALIZAR TEXTO
  // =========================

  function normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  // =========================
  // GERAR ID
  // =========================

  function gerarId(
    titulo: string,
    modelos: MessageModel[]
  ): string {
    const base =
      titulo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "modelo";

    let id = base;
    let contador = 1;

    while (modelos.some((model) => model.id === id)) {
      id = `${base}-${contador}`;
      contador++;
    }

    return id;
  }

  // =========================
  // LER EXCEL / CSV
  // =========================

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setLoading(true);

      // =========================
      // LER ARQUIVO
      // =========================

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      // =========================
      // PRIMEIRA ABA
      // =========================

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "Nenhuma planilha encontrada."
        );
      }

      const worksheet = workbook.Sheets[sheetName];

      // =========================
      // CONVERTER PLANILHA
      // =========================

      const rows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: "",
        });

      if (rows.length === 0) {
        throw new Error(
          "A planilha está vazia."
        );
      }

      // =========================
      // VALIDAR CABEÇALHO
      // =========================

      const headers = Object.keys(rows[0]);

      const tituloHeader = headers.find(
        (header) =>
          normalizeText(header) === "titulo"
      );

      if (!tituloHeader) {
        throw new Error(
          "A planilha precisa possuir uma coluna 'titulo'."
        );
      }

      // =========================
      // ENCONTRAR TEXTO1, TEXTO2...
      // =========================

      const textoHeaders = headers
        .filter((header) => {
          const normalizado = header
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

          return normalizado.startsWith("texto");
        })
        .sort((a, b) => {
          const obterNumero = (header: string) => {
            const match = header
              .trim()
              .match(/^texto\s*(\d+)/i);

            return match
              ? Number(match[1])
              : Infinity;
          };

          const numeroA = obterNumero(a);
          const numeroB = obterNumero(b);

          if (numeroA !== numeroB) {
            return numeroA - numeroB;
          }

          return a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );
        });

      // =========================
      // PARSEAR LINHAS
      // =========================

      const parsedRows: PreviewRow[] = [];

      const titulosEncontrados =
        new Set<string>();

      const linhasDuplicadas: string[] = [];

      rows.forEach((row, index) => {
        const titulo = valueToString(
          row[tituloHeader]
        );

        // =========================
        // IGNORAR LINHA VAZIA
        // =========================

        const linhaVazia =
          Object.values(row).every(
            (value) =>
              valueToString(value) === ""
          );

        if (linhaVazia) {
          return;
        }

        // =========================
        // TÍTULO OBRIGATÓRIO
        // =========================

        if (!titulo) {
          throw new Error(
            `A linha ${index + 2} não possui título.`
          );
        }

        // =========================
        // VERIFICAR TÍTULO DUPLICADO
        // =========================

        const tituloNormalizado =
          normalizeText(titulo);

        if (
          titulosEncontrados.has(
            tituloNormalizado
          )
        ) {
          linhasDuplicadas.push(titulo);
          return;
        }

        titulosEncontrados.add(
          tituloNormalizado
        );

        // =========================
        // PEGAR TODAS AS VARIANTES
        // =========================

        const textos: string[] = [];

        textoHeaders.forEach((header) => {
          const texto = valueToString(
            row[header]
          );

          if (texto) {
            textos.push(texto);
          }
        });

        // =========================
        // PRECISA TER PELO MENOS UM TEXTO
        // =========================

        if (textos.length === 0) {
          throw new Error(
            `O modelo "${titulo}" não possui nenhuma variante preenchida.`
          );
        }

        // =========================
        // REMOVER VARIANTES DUPLICADAS
        // =========================

        const textosUnicos = Array.from(
          new Set(textos)
        );

        parsedRows.push({
          titulo,
          textos: textosUnicos,
        });
      });

      // =========================
      // VERIFICAR TÍTULOS DUPLICADOS
      // =========================

      if (linhasDuplicadas.length > 0) {
        const titulos = Array.from(
          new Set(linhasDuplicadas)
        );

        throw new Error(
          `Existem títulos duplicados na planilha: ${titulos.join(
            ", "
          )}. Cada modelo deve ocupar apenas uma linha.`
        );
      }

      // =========================
      // VERIFICAR RESULTADO
      // =========================

      if (parsedRows.length === 0) {
        throw new Error(
          "Nenhuma linha válida encontrada."
        );
      }

      // =========================
      // IMPORTAR
      // =========================

      importar(parsedRows);
    } catch (error) {
      console.error(
        "Erro ao importar arquivo:",
        error
      );

      const mensagem =
        error instanceof Error
          ? error.message
          : "Erro ao importar arquivo.";

      toast.error(`${mensagem}`);
    } finally {
      setLoading(false);

      // =========================
      // LIMPAR INPUT
      // =========================

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // =========================
  // IMPORTAR MODELOS
  // =========================

  function importar(rows: PreviewRow[]) {
    const merged: MessageModel[] =
      models.map((model) => ({
        ...model,
        variantes: [...model.variantes],
      }));

    let novosModelos = 0;
    let variantesImportadas = 0;
    let variantesIgnoradas = 0;

    // =========================
    // PROCESSAR CADA LINHA
    // =========================

    rows.forEach((row) => {
      const existingIndex =
        merged.findIndex(
          (model) =>
            normalizeText(model.titulo) ===
            normalizeText(row.titulo)
        );

      // =========================
      // MODELO NOVO
      // =========================

      if (existingIndex === -1) {
        const id = gerarId(
          row.titulo,
          merged
        );

        const variantes = row.textos.map(
          (texto, index) => ({
            id: `${id}-${index + 1}`,
            texto,
          })
        );

        merged.push({
          id,
          titulo: row.titulo,
          variantes,
        });

        novosModelos++;
        variantesImportadas += variantes.length;

        return;
      }

      // =========================
      // MODELO EXISTENTE
      // =========================

      const existing =
        merged[existingIndex];

      row.textos.forEach((texto) => {
        const exists =
          existing.variantes.some(
            (existingVariant) =>
              normalizeText(
                existingVariant.texto
              ) === normalizeText(texto)
          );

        // =========================
        // VARIANTE JÁ EXISTE
        // =========================

        if (exists) {
          variantesIgnoradas++;
          return;
        }

        // =========================
        // ADICIONAR VARIANTE
        // =========================

        existing.variantes.push({
          id: `${existing.id}-${existing.variantes.length + 1}`,
          texto,
        });

        variantesImportadas++;
      });

      existing.titulo = row.titulo;
    });

    // =========================
    // ATUALIZAR MODELOS
    // =========================

    onModelsChange(merged);

    // IMPORTANTE:
    // Não selecionamos nenhum modelo aqui.
    // A seleção continua sob controle do componente pai.

    // =========================
    // MENSAGEM
    // =========================

    const partes: string[] = [];

    if (novosModelos > 0) {
      partes.push(
        `${novosModelos} ${
          novosModelos === 1
            ? "modelo novo"
            : "modelos novos"
        }`
      );
    }

    if (variantesImportadas > 0) {
      partes.push(
        `${variantesImportadas} ${
          variantesImportadas === 1
            ? "variante"
            : "variantes"
        }`
      );
    }

    let mensagem =
      partes.length > 0
        ? `${partes.join(" e ")} importado${
            novosModelos +
              variantesImportadas ===
            1
              ? ""
              : "s"
          }.`
        : "Importação concluída.";

    if (variantesIgnoradas > 0) {
      mensagem += ` ${variantesIgnoradas} ${
        variantesIgnoradas === 1
          ? "variante já existente foi ignorada"
          : "variantes já existentes foram ignoradas"
      }.`;
    }


    toast.success(mensagem);
    openModelSelect(true)
  }

  // =========================
  // SELECIONAR ARQUIVO
  // =========================

  function selecionarArquivo() {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  }

  // =========================
  // RENDER
  // =========================

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={selecionarArquivo}
        disabled={loading}
      >
        <Import />

        {loading
          ? "Importando..."
          : "Importar modelos"}
      </Button>
    </>
  );
}

