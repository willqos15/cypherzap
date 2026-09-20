import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";

import * as XLSX from "xlsx-js-style";

import { Button } from "../../../../components/ui/button";

import type { MessageModel } from "../../../../types/MessageModel";

import MessageModelImport from "./MessageModelImport";

import { useState } from "react";

import { Download, Trash2 } from "lucide-react";
import EditModelDialog from "./EditModelDialog";

type Props = {
  models: MessageModel[];
  onModelsChange: (models: MessageModel[]) => void;
  selectedModelId: string | null;
  onModelSelect: (modelId: string | null) => void;
  disabled?: boolean;
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
  // EXPORTAR MODELOS
  // ========================================

  function handleExport(modelsToExport: MessageModel[]) {
    const rows = modelsToExport.map((model) => {
      const row: Record<string, string> = {
        titulo: model.titulo,
      };

      model.variantes.forEach((variante, index) => {
        row[`texto ${index + 1}`] = variante.texto;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const maxVariantes = Math.max(
      ...modelsToExport.map(
        (model) => model.variantes.length
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
        { length: maxVariantes },
        () => ({
          wch: TEXT_COLUMN_WIDTH,
        })
      ),
    ];

    // ========================================
    // CALCULAR ALTURA DAS LINHAS
    // ========================================

    function estimateLineCount(
      text: string,
      columnWidth: number
    ) {
      if (!text) return 1;

      const lines = text.split(/\r?\n/);

      let totalLines = 0;

      for (const line of lines) {
        if (!line) {
          totalLines += 1;
          continue;
        }

        let estimatedWidth = 0;

        for (const char of line) {
          const codePoint = char.codePointAt(0) ?? 0;

          const isEmoji =
            codePoint > 0x1f000 ||
            (codePoint >= 0x2600 &&
              codePoint <= 0x27bf);

          estimatedWidth += isEmoji ? 2 : 1;
        }

        const words = line.split(/\s+/);

        let calculatedLines = Math.ceil(
          estimatedWidth / columnWidth
        );

        for (const word of words) {
          let wordWidth = 0;

          for (const char of word) {
            const codePoint =
              char.codePointAt(0) ?? 0;

            const isEmoji =
              codePoint > 0x1f000 ||
              (codePoint >= 0x2600 &&
                codePoint <= 0x27bf);

            wordWidth += isEmoji ? 2 : 1;
          }

          if (wordWidth > columnWidth) {
            calculatedLines = Math.max(
              calculatedLines,
              Math.ceil(wordWidth / columnWidth)
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

    rows.forEach((row) => {
      let maxLines = 1;

      Object.entries(row).forEach(
        ([key, value]) => {
          const columnWidth =
            key === "titulo"
              ? 30
              : TEXT_COLUMN_WIDTH;

          const lines = estimateLineCount(
            value,
            columnWidth
          );

          maxLines = Math.max(
            maxLines,
            lines
          );
        }
      );

      const calculatedHeight = Math.max(
        45,
        maxLines * 20 + 25
      );

      rowHeights.push({
        hpt: calculatedHeight,
      });
    });

    worksheet["!rows"] = rowHeights;

    // ========================================
    // ESTILIZAR CÉLULAS
    // ========================================

    const range = XLSX.utils.decode_range(
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

        const cell = worksheet[cellAddress];

        if (!cell) continue;

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

      const cell = worksheet[cellAddress];

      if (!cell) continue;

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
    // EXPORTAR
    // ========================================

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Modelos"
    );

    const filename =
      modelsToExport.length === 1
        ? `modelo-${modelsToExport[0].titulo}.xlsx`
        : "modelos.xlsx";

    XLSX.writeFile(workbook, filename);
  }

  // ========================================
  // EXPORTAR UM MODELO
  // ========================================

  function handleExportOne(
    model: MessageModel
  ) {
    handleExport([model]);
  }

  // ========================================
  // EXCLUIR UM MODELO
  // ========================================

  function handleDelete(modelId: string) {
    const updatedModels = models.filter(
      (model) => model.id !== modelId
    );

    onModelsChange(updatedModels);

    // Se o modelo excluído era o selecionado,
    // limpa a seleção.
    if (selectedModelId === modelId) {
      onModelSelect(null);
    }
  }

  // ========================================
  // MODELO SELECIONADO
  // ========================================

  const selectedModel = models.find(
    (model) => model.id === selectedModelId
  );

  // ========================================
  // SELECIONAR MODELO
  // ========================================

  function handleSelect(modelId: string) {
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

          {/* ========================================
              MODELOS
          ======================================== */}

          {models.map((model) => {
            const selected =
              model.id === selectedModelId;

            return (
              <div
                key={model.id}
                className={`
                  w-full rounded-md border
                  p-3 transition
                  ${selected
                    ? "border-primary bg-muted"
                    : ""
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">

                  {/* MODELO */}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      handleSelect(model.id)
                    }
                    className="min-w-0 flex-1 text-left hover:opacity-80"
                  >
                    <div className="font-medium truncate">
                      Modelo: {model.titulo}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {model.variantes.length}{" "}
                      {model.variantes.length === 1
                        ? "variante"
                        : "variantes"}
                    </div>
                  </button>

                  {/* AÇÕES */}

                  <div className="flex items-center gap-1">

                    <EditModelDialog
                      model={model}
                      disabled={disabled}
                      onSave={(updatedModel) => {
                        const updatedModels = models.map((currentModel) =>
                          currentModel.id === updatedModel.id
                            ? updatedModel
                            : currentModel
                        );

                        onModelsChange(updatedModels);
                      }}
                    />

                    {/* EXPORTAR */}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      title="Exportar modelo"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleExportOne(model);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* EXCLUIR */}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      title="Excluir modelo"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(model.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                  </div>
                </div>
              </div>
            );
          })}

          {/* ========================================
              AÇÕES GERAIS
          ======================================== */}

          <div className="flex flex-col gap-2">

            <Button
              type="button"
              variant="secondary"
              className="w-full font-bold"
              disabled={disabled}
              onClick={() =>
                handleExport(models)
              }
            >
              Exportar modelos
            </Button>

            <Button
              type="button"
              variant="delete"
              className="w-full"
              disabled={disabled}
              onClick={handleRemoveImport}
            >
              Remover importação
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

