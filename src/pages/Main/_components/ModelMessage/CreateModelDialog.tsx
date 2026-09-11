
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

import type {
  MessageModel,
  MessageVariant,
} from "../../../../types/MessageModel";
import { Input } from "../../../../components/ui/input";
import { Plus, X } from "lucide-react";

type Props = {
  models: MessageModel[];
  sending: boolean;

  // Modelo que será editado.
  // Quando for null, estamos criando.
  editingModel?: MessageModel | null;

  onCreate: (model: MessageModel) => void;

  // Usado somente durante a edição.
  onCancel?: () => void;
};

export default function CreateModelDialog({
  models,
  sending,
  editingModel = null,
  onCreate,
  onCancel,
}: Props) {
  const [open, setOpen] = useState(false);

  const [modelTitle, setModelTitle] = useState("");

  const [variants, setVariants] = useState<string[]>([""]);

  const [error, setError] = useState("");

  // =========================
  // MODO
  // =========================

  const isEditing = editingModel !== null;

  // =========================
  // GERAR ID AUTOMÁTICO
  // =========================

  function gerarIdUnico(): string {
    let id = "";

    do {
      const parteAleatoria = Math.random()
        .toString(36)
        .substring(2, 10);

      id = `modelo-${parteAleatoria}`;
    } while (models.some((model) => model.id === id));

    return id;
  }

  // =========================
  // CARREGAR MODELO PARA EDIÇÃO
  // =========================

  useEffect(() => {
    if (!editingModel) {
      return;
    }

    setModelTitle(editingModel.titulo);

    setVariants(
      editingModel.variantes.map(
        (variant) => variant.texto
      )
    );

    setError("");

    setOpen(true);
  }, [editingModel]);

  // =========================
  // LIMPAR FORMULÁRIO
  // =========================

  function limparFormulario() {
    setModelTitle("");
    setVariants([""]);
    setError("");
  }

  // =========================
  // FECHAR
  // =========================

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (!value) {
      limparFormulario();

      if (isEditing) {
        onCancel?.();
      }
    }
  }

  // =========================
  // ADICIONAR VARIANTE
  // =========================

  function adicionarVariante() {
    setVariants((current) => [
      ...current,
      "",
    ]);
  }

  // =========================
  // REMOVER VARIANTE
  // =========================

  function removerVariante(index: number) {
    if (variants.length <= 1) {
      return;
    }

    setVariants((current) =>
      current.filter(
        (_, variantIndex) =>
          variantIndex !== index
      )
    );
  }

  // =========================
  // ALTERAR VARIANTE
  // =========================

  function alterarVariante(
    index: number,
    value: string
  ) {
    setVariants((current) =>
      current.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? value
            : variant
      )
    );
  }

  // =========================
  // SALVAR MODELO
  // =========================

  function salvarModelo() {
    setError("");

    const titulo = modelTitle.trim();

    const textos = variants.map(
      (variant) => variant.trim()
    );

    // =========================
    // VALIDA TÍTULO
    // =========================

    if (!titulo) {
      setError(
        "Informe o título do modelo."
      );

      return;
    }

    // =========================
    // VALIDA VARIANTES
    // =========================

    if (
      textos.length === 0 ||
      textos.some((texto) => !texto)
    ) {
      setError(
        "Preencha todas as variantes."
      );

      return;
    }

    // =========================
    // ID
    // =========================

    // Durante a edição mantém o ID original.
    // Durante a criação gera um novo ID.
    const id = editingModel?.id ?? gerarIdUnico();

    // =========================
    // CRIA VARIANTES
    // =========================

    const modelVariants: MessageVariant[] =
      textos.map((texto, index) => ({
        id:
          editingModel?.variantes[index]?.id ??
          `${id}-${index + 1}`,

        texto,
      }));

    // =========================
    // MODELO FINAL
    // =========================

    const model: MessageModel = {
      id,
      titulo,
      variantes: modelVariants,
    };

    // =========================
    // ENVIA PARA O PAI
    // =========================

    onCreate(model);

    // =========================
    // FECHA
    // =========================

    setOpen(false);

    limparFormulario();
  }

  // =========================
  // CANCELAR
  // =========================

  function cancelar() {
    setOpen(false);

    limparFormulario();

    onCancel?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      {/* =========================
          BOTÃO ABRIR
      ========================= */}

      {!isEditing && (
        <DialogTrigger
          render={
            <Button
              variant="secondary"
              type="button"
              disabled={sending}
            >
              <Plus/> Criar modelo
            </Button>
          }
        />
      )}

      {/* =========================
          MODAL
      ========================= */}

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
        <DialogHeader>
          <DialogTitle className="font-semibold">
            {isEditing
              ? "Editar modelo de mensagem"
              : "Criar modelo de mensagem"}
          </DialogTitle>

        </DialogHeader>

        {/* =========================
            TÍTULO
        ========================= */}

        <div className="space-y-4">
          <label
            htmlFor="model-title"
            className="text-sm font-medium mb-4"
          >
            Título do Modelo:
          </label>

          <Input
            id="model-title"
            placeholder="Exemplo: Disparo promoção de Natal"
            value={modelTitle}
            disabled={sending}
            onChange={(event) =>
              setModelTitle(
                event.target.value
              )
            }
          />
        </div>

        {/* =========================
            VARIANTES
        ========================= */}

        <div className="space-y-4">

         
          

          {/* =========================
              LISTA DE VARIANTES
          ========================= */}

          <div className="space-y-4">
            {variants.map(
              (variant, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`variant-${index}`}
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
                        <X/>
                      </Button>
                    )}
                  </div>

                  <Textarea
                    id={`variant-${index}`}
                    placeholder={`Digite o texto da mensagem...`}
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
              )
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={adicionarVariante}
              disabled={sending}
            >
              + Adicionar variação de mensagem
            </Button>
          </div>
        </div>

        {/* =========================
            ERRO
        ========================= */}

        {error && (
          <p className="text-sm text-destructive">
            ❌ {error}
          </p>
        )}

        {/* =========================
            BOTÕES
        ========================= */}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={cancelar}
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
            {isEditing
              ? "Salvar alterações"
              : "Criar modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

