import {
  useRef,
  useState,
} from "react";

import type { ChangeEvent } from "react";

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import type { MessageModel } from "../../../../types/MessageModel";
import type { MessageAttachmentData } from "../../../../types/Attachment";

import { Button } from "../../../../components/ui/button";
import { Import } from "lucide-react";
import { toast } from "sonner";

type PreviewRow = {
  titulo: string;
  textos: string[];
  rowNumber: number;
  attachment?: MessageAttachmentData | null;
  attachmentInfo?: string | null;
};

type ImportedImage = {
  rowNumber: number;
  file: File;
};

type ZipManifestAttachment = {
  rowNumber: number;
  fileName: string;
  path: string;
  type: MessageAttachmentData["type"];
  mimeType: string;
};

type ZipManifest = {
  version: number;
  attachments: ZipManifestAttachment[];
};

type Props = {
  models: MessageModel[];
  onModelsChange: (
    models: MessageModel[]
  ) => void;
  openModelSelect: React.Dispatch<
    React.SetStateAction<boolean>
  >;
};

export default function MessageModelImport({
  models,
  onModelsChange,
  openModelSelect,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [loading, setLoading] =
    useState(false);

  // =========================
  // CONVERTER VALOR
  // =========================

  function valueToString(
    value: unknown
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();
  }

  // =========================
  // NORMALIZAR TEXTO
  // =========================

  function normalizeText(
    value: string
  ): string {
    return value
      .trim()
      .toLowerCase();
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
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          "" 
        ) || "modelo";

    let id = base;
    let contador = 1;

    while (
      modelos.some(
        (model) =>
          model.id === id
      )
    ) {
      id = `${base}-${contador}`;
      contador++;
    }

    return id;
  }

  // =========================
  // MIME DA IMAGEM
  // =========================

  function getImageMimeType(
    extension?: string
  ): string {
    switch (
      extension?.toLowerCase()
    ) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";

      case "gif":
        return "image/gif";

      case "webp":
        return "image/webp";

      case "bmp":
        return "image/bmp";

      case "svg":
        return "image/svg+xml";

      case "png":
      default:
        return "image/png";
    }
  }

  // =========================
  // LER IMAGENS DO XLSX
  // =========================

  async function readExcelImages(
    buffer: ArrayBuffer
  ): Promise<ImportedImage[]> {
    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      buffer
    );

    const worksheet =
      workbook.getWorksheet(
        "Modelos"
      ) ??
      workbook.worksheets[0];

    if (!worksheet) {
      return [];
    }

    const images =
      worksheet.getImages();

    const importedImages:
      ImportedImage[] = [];

    for (const image of images) {
      const imageData =
        workbook.getImage(
          Number(image.imageId)
        );

      if (!imageData) {
        continue;
      }

      // ========================================
      // DESCOBRIR LINHA DA IMAGEM
      // ========================================

      const rowNumber =
        Math.floor(
          image.range.tl.row
        ) + 1;

      // ========================================
      // CONVERTER IMAGEM PARA FILE
      // ========================================

      let blob:
        Blob | null = null;

      let extension = "png";

      if (imageData.buffer) {
        blob = new Blob(
          [imageData.buffer],
          {
            type: getImageMimeType(
              imageData.extension
            ),
          }
        );

        extension =
          imageData.extension ||
          "png";
      } else if (
        imageData.base64
      ) {
        const base64 =
          imageData.base64.includes(
            ","
          )
            ? imageData.base64.split(
                ","
              )[1]
            : imageData.base64;

        const binary =
          atob(base64);

        const bytes =
          new Uint8Array(
            binary.length
          );

        for (
          let i = 0;
          i < binary.length;
          i++
        ) {
          bytes[i] =
            binary.charCodeAt(i);
        }

        blob = new Blob(
          [bytes],
          {
            type: getImageMimeType(
              imageData.extension
            ),
          }
        );

        extension =
          imageData.extension ||
          "png";
      }

      if (!blob) {
        continue;
      }

      const fileName =
        `imagem-modelo-${rowNumber}.${extension}`;

      const importedFile =
        new File(
          [blob],
          fileName,
          {
            type: blob.type,
          }
        );

      importedImages.push({
        rowNumber,
        file: importedFile,
      });
    }

    return importedImages;
  }

  // =========================
  // LER ANEXOS DO ZIP
  // =========================

  async function readZipAttachments(
    zip: JSZip
  ): Promise<
    Map<
      number,
      MessageAttachmentData
    >
  > {
    const result =
      new Map<
        number,
        MessageAttachmentData
      >();

    const manifestFile =
      zip.file(
        "manifest.json"
      );

    if (!manifestFile) {
      return result;
    }

    const manifestText =
      await manifestFile.async(
        "text"
      );

    const manifest =
      JSON.parse(
        manifestText
      ) as ZipManifest;

    if (
      !Array.isArray(
        manifest.attachments
      )
    ) {
      return result;
    }

    for (const attachment of manifest.attachments) {
      const zipFile =
        zip.file(
          attachment.path
        );

      if (!zipFile) {
        console.warn(
          `Anexo não encontrado no ZIP: ${attachment.path}`
        );

        continue;
      }

      const arrayBuffer =
        await zipFile.async(
          "arraybuffer"
        );

      const file =
        new File(
          [arrayBuffer],
          attachment.fileName,
          {
            type:
              attachment.mimeType ||
              "application/octet-stream",
          }
        );

      result.set(
        attachment.rowNumber,
        {
          file,
          type: attachment.type,
        }
      );
    }

    return result;
  }

  // =========================
  // LER XLSX DENTRO DO ZIP
  // =========================

  async function readZipFile(
    file: File
  ): Promise<{
    xlsxBuffer: ArrayBuffer;
    attachments: Map<
      number,
      MessageAttachmentData
    >;
  }> {
    const buffer =
      await file.arrayBuffer();

    const zip =
      await JSZip.loadAsync(
        buffer
      );

    const xlsxFile =
      zip.file(
        "modelos.xlsx"
      );

    if (!xlsxFile) {
      throw new Error(
        "O ZIP não possui o arquivo modelos.xlsx."
      );
    }

    const xlsxBuffer =
      await xlsxFile.async(
        "arraybuffer"
      );

    const attachments =
      await readZipAttachments(
        zip
      );

    return {
      xlsxBuffer,
      attachments,
    };
  }

  // =========================
  // NORMALIZAR CABEÇALHO
  // =========================

  function normalizeHeader(
    header: string
  ): string {
    return header
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ""
      );
  }

  // =========================
  // LER EXCEL / CSV / ZIP
  // =========================

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setLoading(true);

      // =========================
      // DETECTAR ZIP
      // =========================

      const isZip =
        file.name
          .toLowerCase()
          .endsWith(".zip");

      let buffer: ArrayBuffer;

      let zipAttachments =
        new Map<
          number,
          MessageAttachmentData
        >();

      if (isZip) {
        const result =
          await readZipFile(
            file
          );

        buffer =
          result.xlsxBuffer;

        zipAttachments =
          result.attachments;
      } else {
        buffer =
          await file.arrayBuffer();
      }

      // =========================
      // LER XLSX
      // =========================

      const workbook =
        XLSX.read(buffer, {
          type: "array",
        });

      // =========================
      // PRIMEIRA ABA
      // =========================

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "Nenhuma planilha encontrada."
        );
      }

      const worksheet =
        workbook.Sheets[
          sheetName
        ];

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
      // LER IMAGENS
      // =========================

      let importedImages:
        ImportedImage[] = [];

      if (
        file.name
          .toLowerCase()
          .endsWith(".xlsx") ||
        isZip
      ) {
        try {
          importedImages =
            await readExcelImages(
              buffer
            );
        } catch (error) {
          console.error(
            "Erro ao ler imagens do Excel:",
            error
          );

          toast.warning(
            "Os textos foram lidos, mas não foi possível recuperar algumas imagens."
          );
        }
      }

      // =========================
      // VALIDAR CABEÇALHO
      // =========================

      const headers =
        Object.keys(
          rows[0]
        );

      const tituloHeader =
        headers.find(
          (header) =>
            normalizeText(
              header
            ) === "titulo"
        );

      if (!tituloHeader) {
        throw new Error(
          "A planilha precisa possuir uma coluna 'titulo'."
        );
      }

      // =========================
      // ENCONTRAR COLUNA DE ANEXO
      // =========================

      const anexoHeader =
        headers.find(
          (header) =>
            normalizeHeader(
              header
            ) === "anexo"
        );

      const imagemHeader =
        headers.find(
          (header) =>
            normalizeHeader(
              header
            ) === "imagem"
        );

      const attachmentHeader =
        anexoHeader ??
        imagemHeader;

      // =========================
      // ENCONTRAR TEXTO1, TEXTO2...
      // =========================

      const textoHeaders =
        headers
          .filter(
            (header) => {
              const normalizado =
                normalizeHeader(
                  header
                );

              return normalizado.startsWith(
                "texto"
              );
            }
          )
          .sort(
            (a, b) => {
              const obterNumero =
                (
                  header: string
                ) => {
                  const match =
                    header
                      .trim()
                      .match(
                        /^texto\s*(\d+)/i
                      );

                  return match
                    ? Number(
                        match[1]
                      )
                    : Infinity;
                };

              const numeroA =
                obterNumero(a);

              const numeroB =
                obterNumero(b);

              if (
                numeroA !==
                numeroB
              ) {
                return (
                  numeroA -
                  numeroB
                );
              }

              return a.localeCompare(
                b,
                undefined,
                {
                  numeric: true,
                  sensitivity:
                    "base",
                }
              );
            }
          );

      // =========================
      // PARSEAR LINHAS
      // =========================

      const parsedRows:
        PreviewRow[] = [];

      const titulosEncontrados =
        new Set<string>();

      const linhasDuplicadas:
        string[] = [];

      rows.forEach(
        (
          row,
          index
        ) => {
          const titulo =
            valueToString(
              row[
                tituloHeader
              ]
            );

          // =========================
          // IGNORAR LINHA VAZIA
          // =========================

          const linhaVazia =
            Object.values(
              row
            ).every(
              (value) =>
                valueToString(
                  value
                ) === ""
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
            normalizeText(
              titulo
            );

          if (
            titulosEncontrados.has(
              tituloNormalizado
            )
          ) {
            linhasDuplicadas.push(
              titulo
            );

            return;
          }

          titulosEncontrados.add(
            tituloNormalizado
          );

          // =========================
          // PEGAR TODAS AS VARIANTES
          // =========================

          const textos:
            string[] = [];

          textoHeaders.forEach(
            (header) => {
              const texto =
                valueToString(
                  row[header]
                );

              if (texto) {
                textos.push(
                  texto
                );
              }
            }
          );

          // =========================
          // PRECISA TER PELO MENOS UM TEXTO
          // =========================

          if (
            textos.length === 0
          ) {
            throw new Error(
              `O modelo "${titulo}" não possui nenhuma variante preenchida.`
            );
          }

          // =========================
          // REMOVER VARIANTES DUPLICADAS
          // =========================

          const textosUnicos =
            Array.from(
              new Set(textos)
            );

          // =========================
          // LINHA DO EXCEL
          // =========================

          const excelRowNumber =
            index + 2;

          // =========================
          // PRIMEIRO:
          // ANEXO REAL DO ZIP
          // =========================

          let attachment =
            zipAttachments.get(
              excelRowNumber
            ) ?? null;

          // =========================
          // SEGUNDO:
          // IMAGEM EMBUTIDA NO XLSX
          // =========================

          if (!attachment) {
            const importedImage =
              importedImages.find(
                (image) =>
                  image.rowNumber ===
                  excelRowNumber
              );

            if (importedImage) {
              attachment = {
                file:
                  importedImage.file,

                type:
                  "image",
              };
            }
          }

          // =========================
          // INFORMAÇÃO DO ANEXO
          // =========================

          const attachmentInfo =
            attachmentHeader
              ? valueToString(
                  row[
                    attachmentHeader
                  ]
                )
              : null;

          parsedRows.push({
            titulo,
            textos:
              textosUnicos,

            rowNumber:
              excelRowNumber,

            attachment,

            attachmentInfo:
              attachmentInfo ||
              null,
          });
        }
      );

      // =========================
      // VERIFICAR TÍTULOS DUPLICADOS
      // =========================

      if (
        linhasDuplicadas.length >
        0
      ) {
        const titulos =
          Array.from(
            new Set(
              linhasDuplicadas
            )
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

      if (
        parsedRows.length === 0
      ) {
        throw new Error(
          "Nenhuma linha válida encontrada."
        );
      }

      // =========================
      // IMPORTAR
      // =========================

      importar(
        parsedRows
      );
    } catch (error) {
      console.error(
        "Erro ao importar arquivo:",
        error
      );

      const mensagem =
        error instanceof Error
          ? error.message
          : "Erro ao importar arquivo.";

      toast.error(
        mensagem
      );
    } finally {
      setLoading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  // =========================
  // IMPORTAR MODELOS
  // =========================

  function importar(
    rows: PreviewRow[]
  ) {
    const merged:
      MessageModel[] =
      models.map(
        (model) => ({
          ...model,

          variantes: [
            ...model.variantes,
          ],

          attachment:
            model.attachment ??
            null,
        })
      );

    let novosModelos = 0;
    let variantesImportadas = 0;
    let variantesIgnoradas = 0;
    let anexosImportados = 0;
    let anexosNaoRecuperados = 0;

    // =========================
    // PROCESSAR CADA LINHA
    // =========================

    rows.forEach(
      (row) => {
        const existingIndex =
          merged.findIndex(
            (model) =>
              normalizeText(
                model.titulo
              ) ===
              normalizeText(
                row.titulo
              )
          );

        // =========================
        // MODELO NOVO
        // =========================

        if (
          existingIndex === -1
        ) {
          const id =
            gerarId(
              row.titulo,
              merged
            );

          const variantes =
            row.textos.map(
              (
                texto,
                index
              ) => ({
                id: `${id}-${index + 1}`,
                texto,
              })
            );

          merged.push({
            id,
            titulo:
              row.titulo,

            variantes,

            attachment:
              row.attachment ??
              null,
          });

          novosModelos++;

          variantesImportadas +=
            variantes.length;

          if (
            row.attachment
          ) {
            anexosImportados++;
          } else if (
            row.attachmentInfo
          ) {
            anexosNaoRecuperados++;
          }

          return;
        }

        // =========================
        // MODELO EXISTENTE
        // =========================

        const existing =
          merged[
            existingIndex
          ];

        row.textos.forEach(
          (texto) => {
            const exists =
              existing.variantes.some(
                (
                  existingVariant
                ) =>
                  normalizeText(
                    existingVariant.texto
                  ) ===
                  normalizeText(
                    texto
                  )
              );

            if (exists) {
              variantesIgnoradas++;
              return;
            }

            existing.variantes.push(
              {
                id: `${existing.id}-${existing.variantes.length + 1}`,
                texto,
              }
            );

            variantesImportadas++;
          }
        );

        // =========================
        // ATUALIZAR TÍTULO
        // =========================

        existing.titulo =
          row.titulo;

        // =========================
        // ATUALIZAR ANEXO
        // =========================

        if (
          row.attachment
        ) {
          existing.attachment =
            row.attachment;

          anexosImportados++;
        } else if (
          row.attachmentInfo
        ) {
          anexosNaoRecuperados++;
        }
      }
    );

    // =========================
    // ATUALIZAR MODELOS
    // =========================

    onModelsChange(
      merged
    );

    // =========================
    // MENSAGEM
    // =========================

    const partes: string[] =
      [];

    if (
      novosModelos > 0
    ) {
      partes.push(
        `${novosModelos} ${
          novosModelos === 1
            ? "modelo novo"
            : "modelos novos"
        }`
      );
    }

    if (
      variantesImportadas > 0
    ) {
      partes.push(
        `${variantesImportadas} ${
          variantesImportadas ===
          1
            ? "variante"
            : "variantes"
        }`
      );
    }

    if (
      anexosImportados > 0
    ) {
      partes.push(
        `${anexosImportados} ${
          anexosImportados ===
          1
            ? "anexo"
            : "anexos"
        }`
      );
    }

    let mensagem =
      partes.length > 0
        ? `${partes.join(
            " e "
          )} importado${
            novosModelos +
              variantesImportadas +
              anexosImportados ===
            1
              ? ""
              : "s"
          }.`
        : "Importação concluída.";

    if (
      variantesIgnoradas > 0
    ) {
      mensagem += ` ${variantesIgnoradas} ${
        variantesIgnoradas ===
        1
          ? "variante já existente foi ignorada"
          : "variantes já existentes foram ignoradas"
      }.`;
    }

    toast.success(
      mensagem
    );

    // =========================
    // AVISAR SOBRE ANEXOS
    // =========================

    if (
      anexosNaoRecuperados > 0
    ) {
      setTimeout(() => {
        toast.warning(
          `${anexosNaoRecuperados} ${
            anexosNaoRecuperados ===
            1
              ? "anexo"
              : "anexos"
          } não ${
            anexosNaoRecuperados ===
            1
              ? "pôde"
              : "puderam"
          } ser recuperado${
            anexosNaoRecuperados ===
            1
              ? ""
              : "s"
          }. O arquivo original não estava disponível para reconstrução.`
        );
      }, 300);
    }

    openModelSelect(
      true
    );
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
        accept=".xlsx,.xls,.csv,.zip"
        onChange={
          handleFileChange
        }
        disabled={loading}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={
          selecionarArquivo
        }
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