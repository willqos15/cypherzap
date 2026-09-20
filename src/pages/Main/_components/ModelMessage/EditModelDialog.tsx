import {
  useEffect,
  useRef,
  useState,
} from "react";

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

import type {
  AttachmentType,
  MessageAttachmentData,
} from "../../../../types/Attachment";

import {
  Paperclip,
  Pencil,
  Plus,
  Upload,
  X,
} from "lucide-react";

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

  const [modelTitle, setModelTitle] =
    useState("");

  const [variants, setVariants] =
    useState<string[]>([""]);

  const [attachment, setAttachment] =
    useState<MessageAttachmentData | null>(null);

  const [error, setError] =
    useState("");

  const inputRef =
    useRef<HTMLInputElement>(null);

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
        ? model.variantes.map(
            (variant) => variant.texto
          )
        : [""]
    );

    setAttachment(
      model.attachment ?? null
    );

    setError("");
  }, [open, model]);

  // ========================================
  // LIMPAR
  // ========================================

  function limparFormulario() {
    setModelTitle("");
    setVariants([""]);
    setAttachment(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
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
    setVariants((current) => [
      ...current,
      "",
    ]);
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
        (_, variantIndex) =>
          variantIndex !== index
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
      current.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? value
            : variant
      )
    );
  }

  // ========================================
  // IDENTIFICAR TIPO DO ANEXO
  // ========================================

  function getAttachmentType(
    file: File
  ): AttachmentType {
    if (file.type.startsWith("image/")) {
      return "image";
    }

    if (file.type.startsWith("video/")) {
      return "video";
    }

    if (file.type.startsWith("audio/")) {
      return "audio";
    }

    return "document";
  }

  // ========================================
  // SELECIONAR / TROCAR ANEXO
  // ========================================

  function selecionarAnexo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // ========================================
    // LIMITE DE TAMANHO
    // ========================================

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "O anexo deve ter no máximo 10 MB."
      );

      event.target.value = "";

      return;
    }

    setError("");

    const newAttachment: MessageAttachmentData =
      {
        file,
        type: getAttachmentType(file),
      };

    setAttachment(newAttachment);

    // Permite selecionar novamente
    // o mesmo arquivo.
    event.target.value = "";
  }

  // ========================================
  // ABRIR SELETOR DE ARQUIVO
  // ========================================

  function abrirSeletorArquivo() {
    if (sending) {
      return;
    }

    inputRef.current?.click();
  }

  // ========================================
  // REMOVER ANEXO
  // ========================================

  function removerAnexo() {
    setAttachment(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  // ========================================
  // FORMATAR TAMANHO
  // ========================================

  function formatarTamanhoArquivo(
    bytes: number
  ): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  }

  // ========================================
  // SALVAR
  // ========================================

  function salvarModelo() {
    setError("");

    const titulo =
      modelTitle.trim();

    const textos =
      variants.map(
        (variant) => variant.trim()
      );

    // ========================================
    // VALIDA TÍTULO
    // ========================================

    if (!titulo) {
      setError(
        "Informe o título do modelo."
      );

      return;
    }

    // ========================================
    // VALIDA VARIANTES
    // ========================================

    if (
      textos.length === 0 ||
      textos.some(
        (texto) => !texto
      )
    ) {
      setError(
        "Preencha todas as variantes."
      );

      return;
    }

    // ========================================
    // CRIAR VARIANTES
    // ========================================

    const modelVariants: MessageVariant[] =
      textos.map(
        (texto, index) => ({
          // Mantém o ID da variante existente.
          // Se uma nova variante foi adicionada,
          // gera um ID novo.
          id:
            model.variantes[index]
              ?.id ??
            `${model.id}-${index + 1}`,

          texto,
        })
      );

    // ========================================
    // MODELO ATUALIZADO
    // ========================================

    const updatedModel: MessageModel = {
      id: model.id,
      titulo,
      variantes: modelVariants,

      // Mantém o anexo atual.
      // Pode ser:
      // - o anexo original
      // - um novo anexo
      // - null, caso tenha sido removido
      attachment,
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
      {/* ========================================
          BOTÃO EDITAR
      ======================================== */}

      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={
              sending || disabled
            }
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
            INPUT DE ARQUIVO
            ÚNICO INPUT PARA ADICIONAR/TROCAR
        ======================================== */}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={sending}
          onChange={selecionarAnexo}
          accept="
            image/*,
            video/*,
            audio/*,
            application/pdf,
            text/plain,
            .doc,
            .docx,
            .xls,
            .xlsx,
            .ppt,
            .pptx
          "
        />

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
              setModelTitle(
                event.target.value
              )
            }
          />
        </div>

        {/* ========================================
            ANEXO DO MODELO
        ======================================== */}

        <div className="space-y-3">
            <label className="text-sm font-medium">
              Anexo do modelo:
            </label>

          {attachment ? (
            <div className="rounded-lg border p-3 space-y-3">
              {/* ========================================
                  INFORMAÇÕES DO ANEXO
              ======================================== */}

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                  <Paperclip className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {attachment.file.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {attachment.file.type ||
                      "Tipo de arquivo não identificado"}{" "}
                    •{" "}
                    {formatarTamanhoArquivo(
                      attachment.file.size
                    )}
                  </p>
                </div>
              </div>

              {/* ========================================
                  AÇÕES DO ANEXO
              ======================================== */}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={sending}
                  onClick={
                    abrirSeletorArquivo
                  }
                >
                  <Upload />
                  Trocar anexo
                </Button>

                <Button
                  type="button"
                  variant="delete"
                  onClick={
                    removerAnexo
                  }
                  disabled={sending}
                >
                  <X />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            /* ========================================
               ADICIONAR ANEXO
            ======================================== */

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={sending}
              onClick={
                abrirSeletorArquivo
              }
            >
              <Paperclip />
              Adicionar anexo
            </Button>
          )}
        </div>

        {/* ========================================
            VARIANTES
        ======================================== */}

        <div className="space-y-4">
          <div className="space-y-4">
            {variants.map(
              (variant, index) => (
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

                    {variants.length >
                      1 && (
                      <Button
                        type="button"
                        variant="delete"
                        size="sm"
                        onClick={() =>
                          removerVariante(
                            index
                          )
                        }
                        disabled={
                          sending
                        }
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
              )
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={
                adicionarVariante
              }
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
            onClick={() =>
              setOpen(false)
            }
            disabled={sending}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={
              salvarModelo
            }
            disabled={sending}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}