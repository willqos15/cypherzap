import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";

import * as XLSX from "xlsx-js-style";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import { Button } from "../../../../components/ui/button";
import type { MessageModel } from "../../../../types/MessageModel";
import MessageModelImport from "./MessageModelImport";
import { useState } from "react";
import {
  Download,
  Trash2,
} from "lucide-react";
import EditModelDialog from "./EditModelDialog";

type Props = {
  models: MessageModel[];
  onModelsChange: (
    models: MessageModel[]
  ) => void;
  selectedModelId: string | null;
  onModelSelect: (
    modelId: string | null
  ) => void;
  disabled?: boolean;
};

type AttachmentManifest = {
  rowNumber: number;
  fileName: string;
  path: string;
  type: string;
  mimeType: string;
};

export default function MessageModelSelect({
  models,
  onModelsChange,
  selectedModelId,
  onModelSelect,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);

  // ========================================
  // SEM MODELOS
  // ========================================

  if (models.length === 0) {
    return (
      <MessageModelImport
        models={models}
        onModelsChange={onModelsChange}
        openModelSelect={setOpen}
      />
    );
  }

  // ========================================
  // CONVERTER FILE PARA BASE64
  // ========================================

  async function fileToBase64(
    file: File
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            reader.result as string
          );
        };

        reader.onerror = () => {
          reject(
            new Error(
              "Não foi possível ler o anexo."
            )
          );
        };

        reader.readAsDataURL(file);
      }
    );
  }

  // ========================================
  // OBTER NOME DO TIPO DO ANEXO
  // ========================================

  function getAttachmentLabel(
    type: string
  ) {
    switch (type) {
      case "image":
        return "Imagem";

      case "video":
        return "Vídeo";

      case "audio":
        return "Áudio";

      case "document":
        return "Documento";

      default:
        return "Anexo";
    }
  }

  // ========================================
  // SANITIZAR NOME DO ARQUIVO
  // ========================================

  function sanitizeFileName(
    fileName: string
  ): string {
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "anexo";
  }

  // ========================================
  // OBTER EXTENSÃO DA IMAGEM
  // ========================================

  function getImageExtension(
    mimeType: string
  ): "png" | "jpeg" | "gif" {
    switch (
      mimeType.toLowerCase()
    ) {
      case "image/jpeg":
      case "image/jpg":
        return "jpeg";

      case "image/gif":
        return "gif";

      case "image/png":
      default:
        return "png";
    }
  }

  // ========================================
  // EXPORTAR MODELOS
  // ========================================

  async function handleExport(
    modelsToExport: MessageModel[]
  ) {
    try {
      if (!modelsToExport.length) {
        return;
      }

      // ========================================
      // VERIFICAR SE EXISTEM ANEXOS
      // ========================================

      const hasAttachments =
        modelsToExport.some(
          (model) =>
            Boolean(
              model.attachment?.file
            )
        );

      // ========================================
      // DADOS DA PLANILHA
      // ========================================

      const rows = modelsToExport.map(
        (model) => {
          const row: Record<
            string,
            string
          > = {
            titulo: model.titulo,
          };

          model.variantes.forEach(
            (variante, index) => {
              row[
                `texto ${index + 1}`
              ] = variante.texto;
            }
          );

          row.anexo = "";

          return row;
        }
      );

      // ========================================
      // CRIAR PLANILHA
      // ========================================

      const worksheet =
        XLSX.utils.json_to_sheet(rows);

      const maxVariantes = Math.max(
        ...modelsToExport.map(
          (model) =>
            model.variantes.length
        )
      );

      // ========================================
      // LARGURA DAS COLUNAS
      // ========================================

      const TEXT_COLUMN_WIDTH = 50;

      worksheet["!cols"] = [
        {
          wch: 30,
        },

        ...Array.from(
          {
            length:
              maxVariantes,
          },
          () => ({
            wch: TEXT_COLUMN_WIDTH,
          })
        ),

        {
          wch: 30,
        },
      ];

      // ========================================
      // CALCULAR ALTURA DAS LINHAS
      // ========================================

      function estimateLineCount(
        text: string,
        columnWidth: number
      ) {
        if (!text) {
          return 1;
        }

        const lines =
          text.split(/\r?\n/);

        let totalLines = 0;

        for (const line of lines) {
          if (!line) {
            totalLines += 1;
            continue;
          }

          let estimatedWidth = 0;

          for (const char of line) {
            const codePoint =
              char.codePointAt(0) ?? 0;

            const isEmoji =
              codePoint > 0x1f000 ||
              (codePoint >= 0x2600 &&
                codePoint <= 0x27bf);

            estimatedWidth +=
              isEmoji ? 2 : 1;
          }

          const words =
            line.split(/\s+/);

          let calculatedLines =
            Math.ceil(
              estimatedWidth /
                columnWidth
            );

          for (const word of words) {
            let wordWidth = 0;

            for (const char of word) {
              const codePoint =
                char.codePointAt(0) ??
                0;

              const isEmoji =
                codePoint > 0x1f000 ||
                (codePoint >= 0x2600 &&
                  codePoint <= 0x27bf);

              wordWidth +=
                isEmoji ? 2 : 1;
            }

            if (
              wordWidth >
              columnWidth
            ) {
              calculatedLines =
                Math.max(
                  calculatedLines,
                  Math.ceil(
                    wordWidth /
                      columnWidth
                  )
                );
            }
          }

          totalLines += Math.max(
            1,
            calculatedLines
          );
        }

        return totalLines;
      }

      const rowHeights = [
        {
          hpt: 30,
        },
      ];

      rows.forEach(
        (row, index) => {
          let maxLines = 1;

          Object.entries(row).forEach(
            ([key, value]) => {
              if (key === "anexo") {
                return;
              }

              const columnWidth =
                key === "titulo"
                  ? 30
                  : TEXT_COLUMN_WIDTH;

              const lines =
                estimateLineCount(
                  value,
                  columnWidth
                );

              maxLines = Math.max(
                maxLines,
                lines
              );
            }
          );

          const hasImage =
            modelsToExport[index]
              ?.attachment?.type ===
            "image";

          const calculatedHeight =
            hasImage
              ? Math.max(
                  120,
                  maxLines * 20 + 25
                )
              : Math.max(
                  45,
                  maxLines * 20 + 25
                );

          rowHeights.push({
            hpt: calculatedHeight,
          });
        }
      );

      worksheet["!rows"] =
        rowHeights;

      // ========================================
      // ESTILIZAR CÉLULAS
      // ========================================

      const range =
        XLSX.utils.decode_range(
          worksheet["!ref"] || "A1"
        );

      for (
        let row = range.s.r;
        row <= range.e.r;
        row++
      ) {
        for (
          let col = range.s.c;
          col <= range.e.c;
          col++
        ) {
          const cellAddress =
            XLSX.utils.encode_cell({
              r: row,
              c: col,
            });

          const cell =
            worksheet[cellAddress];

          if (!cell) {
            continue;
          }

          cell.s = {
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            },
          };
        }
      }

      // ========================================
      // CABEÇALHO
      // ========================================

      for (
        let col = range.s.c;
        col <= range.e.c;
        col++
      ) {
        const cellAddress =
          XLSX.utils.encode_cell({
            r: 0,
            c: col,
          });

        const cell =
          worksheet[cellAddress];

        if (!cell) {
          continue;
        }

        cell.s = {
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },

          font: {
            bold: true,
          },
        };
      }

      // ========================================
      // CRIAR WORKBOOK
      // ========================================

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Modelos"
      );

      // ========================================
      // GERAR XLSX EM MEMÓRIA
      // ========================================

      const xlsxBuffer =
        XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

      // ========================================
      // ABRIR COM EXCELJS
      // ========================================

      const excelWorkbook =
        new ExcelJS.Workbook();

      await excelWorkbook.xlsx.load(
        xlsxBuffer
      );

      const excelWorksheet =
        excelWorkbook.getWorksheet(
          "Modelos"
        );

      if (!excelWorksheet) {
        throw new Error(
          "Não foi possível encontrar a planilha Modelos."
        );
      }

      // ========================================
      // COLUNA DO ANEXO
      // ========================================

      const attachmentColumn =
        maxVariantes + 2;

      // ========================================
      // CABEÇALHO DO ANEXO
      // ========================================

      excelWorksheet.getCell(
        1,
        attachmentColumn
      ).value = "anexo";

      // ========================================
      // MANIFESTO DOS ANEXOS
      // ========================================

      const attachmentManifest:
        AttachmentManifest[] = [];

      // ========================================
      // PROCESSAR ANEXOS
      // ========================================

      for (
        let index = 0;
        index <
        modelsToExport.length;
        index++
      ) {
        const model =
          modelsToExport[index];

        const attachment =
          model.attachment;

        if (!attachment) {
          continue;
        }

        const file =
          attachment.file;

        const excelRow =
          index + 2;

        const safeFileName =
          sanitizeFileName(
            file.name
          );

        const attachmentPath =
          `anexos/${excelRow}_${safeFileName}`;

        // ========================================
        // GUARDAR REFERÊNCIA DO ARQUIVO
        // ========================================

        attachmentManifest.push({
          rowNumber: excelRow,
          fileName: file.name,
          path: attachmentPath,
          type: attachment.type,
          mimeType:
            file.type ||
            "application/octet-stream",
        });

        // ========================================
        // NOME VISÍVEL NA PLANILHA
        // ========================================

        excelWorksheet.getCell(
          excelRow,
          attachmentColumn
        ).value =
          `${file.name} (${getAttachmentLabel(
            attachment.type
          )})`;

        // ========================================
        // IMAGEM
        // ========================================

        if (
          attachment.type !==
          "image"
        ) {
          continue;
        }

        try {
          const base64 =
            await fileToBase64(
              file
            );

          const extension =
            getImageExtension(
              file.type
            );

          const imageId =
            excelWorkbook.addImage({
              base64,
              extension,
            });

          excelWorksheet.addImage(
            imageId,
            {
              tl: {
                col:
                  attachmentColumn - 1,

                row:
                  excelRow - 1,
              },

              ext: {
                width: 120,
                height: 120,
              },
            }
          );

          excelWorksheet.getRow(
            excelRow
          ).height = Math.max(
            excelWorksheet.getRow(
              excelRow
            ).height ?? 0,
            100
          );
        } catch (error) {
          console.error(
            "Erro ao adicionar imagem ao Excel:",
            error
          );
        }
      }

      // ========================================
      // ALINHAMENTO DA COLUNA DE ANEXO
      // ========================================

      excelWorksheet.getColumn(
        attachmentColumn
      ).width = 30;

      for (
        let row = 1;
        row <=
        modelsToExport.length + 1;
        row++
      ) {
        excelWorksheet.getCell(
          row,
          attachmentColumn
        ).alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }

      // ========================================
      // GERAR ARQUIVO XLSX FINAL
      // ========================================

      const finalBuffer =
        await excelWorkbook.xlsx.writeBuffer();

      // ========================================
      // SEM ANEXOS
      // ========================================

      if (!hasAttachments) {
        const blob = new Blob(
          [finalBuffer],
          {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

        const url =
          URL.createObjectURL(blob);

        const anchor =
          document.createElement("a");

        anchor.href = url;

        const filename =
          modelsToExport.length === 1
            ? `modelo-${sanitizeFileName(
                modelsToExport[0]
                  .titulo
              )}.xlsx`
            : "modelos.xlsx";

        anchor.download =
          filename;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        document.body.removeChild(
          anchor
        );

        URL.revokeObjectURL(url);

        return;
      }

      // ========================================
      // COM ANEXOS → CRIAR ZIP
      // ========================================

      const zip = new JSZip();

      // ========================================
      // ADICIONAR XLSX AO ZIP
      // ========================================

      zip.file(
        "modelos.xlsx",
        finalBuffer
      );

      // ========================================
      // ADICIONAR MANIFEST.JSON
      // ========================================

      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            version: 1,
            attachments:
              attachmentManifest,
          },
          null,
          2
        )
      );

      // ========================================
      // ADICIONAR ARQUIVOS ORIGINAIS
      // ========================================

      for (const attachment of attachmentManifest) {
        const model =
          modelsToExport[
            attachment.rowNumber - 2
          ];

        const file =
          model?.attachment?.file;

        if (!file) {
          continue;
        }

        const arrayBuffer =
          await file.arrayBuffer();

        zip.file(
          attachment.path,
          arrayBuffer
        );
      }

      // ========================================
      // GERAR ZIP
      // ========================================

      const zipBlob =
        await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: {
            level: 6,
          },
        });

      // ========================================
      // DOWNLOAD ZIP
      // ========================================

      const url =
        URL.createObjectURL(
          zipBlob
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;

      const filename =
        modelsToExport.length === 1
          ? `modelo-${sanitizeFileName(
              modelsToExport[0]
                .titulo
            )}.zip`
          : "modelos.zip";

      anchor.download =
        filename;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      document.body.removeChild(
        anchor
      );

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Erro ao exportar modelos:",
        error
      );
    }
  }

  // ========================================
  // EXPORTAR UM MODELO
  // ========================================

  function handleExportOne(
    model: MessageModel
  ) {
    void handleExport([model]);
  }

  // ========================================
  // EXCLUIR UM MODELO
  // ========================================

  function handleDelete(
    modelId: string
  ) {
    const updatedModels =
      models.filter(
        (model) =>
          model.id !== modelId
      );

    onModelsChange(
      updatedModels
    );

    if (
      selectedModelId ===
      modelId
    ) {
      onModelSelect(null);
    }
  }

  // ========================================
  // MODELO SELECIONADO
  // ========================================

  const selectedModel =
    models.find(
      (model) =>
        model.id ===
        selectedModelId
    );

  // ========================================
  // SELECIONAR MODELO
  // ========================================

  function handleSelect(
    modelId: string
  ) {
    onModelSelect(modelId);
    setOpen(false);
  }

  // ========================================
  // REMOVER IMPORTAÇÃO
  // ========================================

  function handleRemoveImport() {
    onModelsChange([]);
    onModelSelect(null);
    setOpen(false);
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
          >
            {selectedModel
              ? `Modelo: ${selectedModel.titulo}`
              : "Selecionar modelo"}
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold">
            Selecione o Modelo de mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {models.map((model) => {
            const selected =
              model.id ===
              selectedModelId;

            return (
              <div
                key={model.id}
                className={`
                  w-full rounded-md border
                  p-3 transition
                  ${
                    selected
                      ? "border-primary bg-muted"
                      : ""
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      handleSelect(
                        model.id
                      )
                    }
                    className="min-w-0 flex-1 text-left hover:opacity-80"
                  >
                    <div className="font-medium truncate">
                      Modelo:{" "}
                      {model.titulo}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {
                        model
                          .variantes
                          .length
                      }{" "}
                      {model
                        .variantes
                        .length ===
                      1
                        ? "variante"
                        : "variantes"}

                      {model.attachment && (
                        <span>
                          {" "}
                          • anexo
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <EditModelDialog
                      model={model}
                      disabled={
                        disabled
                      }
                      onSave={(
                        updatedModel
                      ) => {
                        const updatedModels =
                          models.map(
                            (
                              currentModel
                            ) =>
                              currentModel.id ===
                              updatedModel.id
                                ? updatedModel
                                : currentModel
                          );

                        onModelsChange(
                          updatedModels
                        );
                      }}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={
                        disabled
                      }
                      title="Exportar modelo"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        handleExportOne(
                          model
                        );
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={
                        disabled
                      }
                      title="Excluir modelo"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        handleDelete(
                          model.id
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full font-bold"
              disabled={
                disabled
              }
              onClick={() =>
                void handleExport(
                  models
                )
              }
            >
              Exportar modelos
            </Button>

            <Button
              type="button"
              variant="delete"
              className="w-full"
              disabled={
                disabled
              }
              onClick={
                handleRemoveImport
              }
            >
              Remover importação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}