import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MessageModel } from "../../../../types/MessageModel";

type Props = {
  model: MessageModel | null;
  message: string;
  onMessageChange: (message: string) => void;
  disabled?: boolean;
};

export default function MessageVariantTextarea({
  model,
  message,
  onMessageChange,
  disabled = false,
}: Props) {
  const [variantIndex, setVariantIndex] = useState(0);
 

  useEffect(() => {
    setVariantIndex(0);

    if (model?.variantes[0]) {
      onMessageChange(model.variantes[0].texto);
    }
  }, [model]);

  function handlePrevious() {
    if (!model || model.variantes.length <= 1) return;

    const newIndex =
      variantIndex === 0
        ? model.variantes.length - 1
        : variantIndex - 1;

    setVariantIndex(newIndex);
    onMessageChange(model.variantes[newIndex].texto);
  }

  function handleNext() {
    if (!model || model.variantes.length <= 1) return;

    const newIndex =
      variantIndex === model.variantes.length - 1
        ? 0
        : variantIndex + 1;

    setVariantIndex(newIndex);
    onMessageChange(model.variantes[newIndex].texto);
  }

  const hasVariants = Boolean(
    model && model.variantes.length > 0
  );

  const canNavigate = Boolean(
    model && model.variantes.length > 1
  );

  return (
    <div className="w-fulL">
      {/* Cabeçalho */}

      {canNavigate && 
      <div className="flex items-center justify-between mb-1">
        <div className="w-10">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={disabled || !canNavigate}
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <span className="text-sm font-medium">
          {hasVariants
            ? `Texto ${variantIndex + 1}`
            : ""}
        </span>

        <div className="w-10 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            disabled={disabled || !canNavigate}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      }

      {/* Textarea */}
      <textarea
        className="border-2 border-gray-300 w-full resize-y box-border p-2.5"
        value={message}
        onChange={(event) =>
          onMessageChange(event.target.value)
        }
        disabled={disabled}
        placeholder="Digite sua mensagem."
        rows={6}
      />
      
    </div>
  );
}