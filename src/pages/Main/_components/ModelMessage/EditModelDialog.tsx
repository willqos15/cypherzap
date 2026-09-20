import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";
import { Input } from "../../../../components/ui/input";
import type {
  MessageModel,
  MessageVariant,
} from "../../../../types/MessageModel";
import { Pencil, Plus, X } from "lucide-react";

type Props = {
  model: MessageModel;
  sending?: boolean;
  onSave: (model: MessageModel) => void;
  disabled: boolean;
};

export default function EditModelDialog({
  model,
  sending = false,
  onSave,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [modelTitle, setModelTitle] = useState("");
  const [variants, setVariants] = useState<string[]>([""]);
  const [error, setError] = useState("");

  // ========================================
  // CARREGAR MODELO
  // ========================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setModelTitle(model.titulo);

    setVariants(
      model.variantes.length > 0
        ? model.variantes.map((variant) => variant.texto)
        : [""]
    );

    setError("");
  }, [open, model]);

  // ========================================
  // LIMPAR
  // ========================================

  function limparFormulario() {
    setModelTitle("");
    setVariants([""]);
    setError("");
  }

  // ========================================
  // FECHAR
  // ========================================

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (!value) {
      limparFormulario();
    }
  }

  // ========================================
  // ADICIONAR VARIANTE
  // ========================================

  function adicionarVariante() {
    setVariants((current) => [...current, ""]);
  }

  // ========================================
  // REMOVER VARIANTE
  // ========================================

  function removerVariante(index: number) {
    if (variants.length <= 1) {
      return;
    }

    setVariants((current) =>
      current.filter(
        (_, variantIndex) => variantIndex !== index
      )
    );
  }

  // ========================================
  // ALTERAR VARIANTE
  // ========================================

  function alterarVariante(
    index: number,
    value: string
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index
          ? value
          : variant
      )
    );
  }

  // ========================================
  // SALVAR
  // ========================================

  function salvarModelo() {
    setError("");

    const titulo = modelTitle.trim();

    const textos = variants.map((variant) =>
      variant.trim()
    );

    // ========================================
    // VALIDA TÍTULO
    // ========================================

    if (!titulo) {
      setError("Informe o título do modelo.");
      return;
    }

    // ========================================
    // VALIDA VARIANTES
    // ========================================

    if (
      textos.length === 0 ||
      textos.some((texto) => !texto)
    ) {
      setError("Preencha todas as variantes.");
      return;
    }

    // ========================================
    // CRIAR VARIANTES
    // ========================================

    const modelVariants: MessageVariant[] =
      textos.map((texto, index) => ({
        // Mantém o ID da variante existente.
        // Se uma nova variante foi adicionada,
        // gera um ID novo.
        id:
          model.variantes[index]?.id ??
          `${model.id}-${index + 1}`,

        texto,
      }));

    // ========================================
    // MODELO ATUALIZADO
    // ========================================

    const updatedModel: MessageModel = {
      id: model.id,
      titulo,
      variantes: modelVariants,
    };

    // ========================================
    // ENVIA PARA O PAI
    // ========================================

    onSave(updatedModel);

    // ========================================
    // FECHA
    // ========================================

    setOpen(false);
    limparFormulario();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={sending || disabled}
            title="Editar modelo"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Editar modelo de mensagem
          </DialogTitle>
        </DialogHeader>

        {/* ========================================
            TÍTULO
        ======================================== */}

        <div className="space-y-2">
          <label
            htmlFor={`edit-model-title-${model.id}`}
            className="text-sm font-medium"
          >
            Título do Modelo:
          </label>

          <Input
            id={`edit-model-title-${model.id}`}
            placeholder="Exemplo: Disparo promoção de Natal"
            value={modelTitle}
            disabled={sending}
            onChange={(event) =>
              setModelTitle(event.target.value)
            }
          />
        </div>

        {/* ========================================
            VARIANTES
        ======================================== */}

        <div className="space-y-4">
          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`edit-variant-${model.id}-${index}`}
                    className="text-sm font-medium text-gray-300"
                  >
                    Nº{index + 1}
                  </label>

                  {variants.length > 1 && (
                    <Button
                      type="button"
                      variant="delete"
                      size="sm"
                      onClick={() =>
                        removerVariante(index)
                      }
                      disabled={sending}
                    >
                      <X />
                    </Button>
                  )}
                </div>

                <Textarea
                  id={`edit-variant-${model.id}-${index}`}
                  placeholder="Digite o texto da mensagem..."
                  value={variant}
                  disabled={sending}
                  rows={5}
                  onChange={(event) =>
                    alterarVariante(
                      index,
                      event.target.value
                    )
                  }
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={adicionarVariante}
              disabled={sending}
            >
              <Plus />
              Adicionar variação de mensagem
            </Button>
          </div>
        </div>

        {/* ========================================
            ERRO
        ======================================== */}

        {error && (
          <p className="text-sm text-destructive">
            ❌ {error}
          </p>
        )}

        {/* ========================================
            BOTÕES
        ======================================== */}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={salvarModelo}
            disabled={sending}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}