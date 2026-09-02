
import { useRef } from "react";
import {
  FileText,
  Image,
  Music,
  Paperclip,
  Video,
  X,
} from "lucide-react";
import { Button } from "#components/ui/button";

export type AttachmentType =
  | "image"
  | "video"
  | "audio"
  | "document";

export type MessageAttachmentData = {
  file: File;
  type: AttachmentType;
};

type Props = {
  attachment: MessageAttachmentData | null;
  onAttachmentChange: (
    attachment: MessageAttachmentData | null
  ) => void;
  disabled?: boolean;
};

function getAttachmentType(
  file: File
): AttachmentType | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  if (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type.includes("document") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("presentation")
  ) {
    return "document";
  }

  return null;
}

function getAttachmentIcon(
  type: AttachmentType
) {
  switch (type) {
    case "image":
      return <Image size={18} />;

    case "video":
      return <Video size={18} />;

    case "audio":
      return <Music size={18} />;

    case "document":
      return <FileText size={18} />;

    default:
      return <Paperclip size={18} />;
  }
}

export default function MessageAttachment({
  attachment,
  onAttachmentChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const type = getAttachmentType(file);

    if (!type) {
      alert("Tipo de arquivo não suportado.");
      event.target.value = "";
      return;
    }

    onAttachmentChange({
      file,
      type,
    });

    event.target.value = "";
  }

  function handleRemove() {
    onAttachmentChange(null);
  }

  return (
    <div className="">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
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
        onChange={handleFileChange}
        disabled={disabled}
      />

      {!attachment ? (
        <Button
          variant ="secondary"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
  
        >
          <Paperclip size={18} />

          <span className="text-sm">
            Anexar arquivo
          </span>
        </Button>
      ) : (
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border
            border-gray-300
            rounded
            px-3
            py-2
          "
        >
          <div className="flex items-center gap-2 min-w-0">
            {getAttachmentIcon(attachment.type)}

            <span
              className="text-sm truncate"
              title={attachment.file.name}
            >
              {attachment.file.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            title="Remover anexo"
            className="
              shrink-0
              p-1
              rounded
              hover:bg-gray-100
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

