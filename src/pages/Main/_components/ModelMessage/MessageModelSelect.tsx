import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";

import * as XLSX from "xlsx";

import { Button } from "../../../../components/ui/button";

import type { MessageModel } from "../../../../types/MessageModel";

import MessageModelImport from "./MessageModelImport";

import { useState } from "react";

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


function handleExport() {
  const rows = models.map((model) => {
    const row: Record<string, string> = {
      titulo: model.titulo,
    };

    model.variantes.forEach((variante, index) => {
      row[`texto ${index + 1}`] = variante.texto;
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Modelos"
  );

  XLSX.writeFile(workbook, "modelos.xlsx");
}

  // ========================================
  // MODELO SELECIONADO
  // ========================================

  const selectedModel = models.find(
    (model) =>
      model.id === selectedModelId
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
          <DialogTitle>
            Modelos de mensagem
          </DialogTitle>

        </DialogHeader>

        <div className="space-y-2">

          {/* ========================================
              MODELOS
          ======================================== */}

          {models.map((model) => {
            const selected =
              model.id ===
              selectedModelId;

            return (
              <button
                key={model.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleSelect(model.id)
                }
                className={`
                  w-full rounded-md border p-3
                  text-left transition
                  hover:bg-muted
                  ${selected
                    ? "border-primary bg-muted"
                    : ""
                  }
                `}
              >
                <div className="font-medium">
                  Modelo: {model.titulo}
                </div>

                <div className="text-sm text-muted-foreground">
                  {model.variantes.length}{" "}
                  {model.variantes.length === 1
                    ? "variante"
                    : "variantes"}
                </div>
              </button>
            );
          })}

          {/* ========================================
              REMOVER IMPORTAÇÃO
          ======================================== */}

          <div className="flex flex-col gap-2">

            <Button
              type="button"
              variant="secondary"
              className="w-full font-bold"
              disabled={disabled}
              onClick={handleExport}
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

