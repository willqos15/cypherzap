
import { useEffect, useState } from "react";

import type { MessageModel } from "../../../../types/MessageModel";

import CreateModelDialog from "../ModelMessage/CreateModelDialog";
import { MessageCircle } from "lucide-react";
import MessageModelSelect from "../ModelMessage/MessageModelSelect";
import MessageTextarea from "./MessageTextArea";
import MessageAttachment from "./MessageAttachment";


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
  models: MessageModel[];
  selectedModelId: string | null;
  sending: boolean;
  message: string;
  setMessage: (value: string) => void;

  attachment: MessageAttachmentData | null;
  onAttachmentChange: (
    attachment: MessageAttachmentData | null
  ) => void;
  disabled?: boolean;

  onModelsChange: (
    models: MessageModel[]
  ) => void;

  onModelSelect: (
    modelId: string | null
  ) => void;
};

export default function MessageComposer({
  models,
  selectedModelId,
  sending,
  onModelsChange,
  onModelSelect,
  message,
  setMessage,
  attachment,
  onAttachmentChange
}: Props) {





  const selectedModel =
    models.find(
      (model) =>
        model.id === selectedModelId
    ) ?? null;

 useEffect(() => {
  if (selectedModelId === null) {
    setMessage("");
    onAttachmentChange(null);
    return;
  }

  const model = models.find(
    (item) => item.id === selectedModelId
  );

  if (!model) {
    setMessage("");
    onAttachmentChange(null);
    return;
  }

  setMessage(model.variantes[0]?.texto ?? "");

  onAttachmentChange(model.attachment ?? null);
}, [selectedModelId, models]);

  // Modelo que está sendo editado
  const [editingModel, setEditingModel] =
    useState<MessageModel | null>(null);



  // =========================
  // SALVAR MODELO
  // =========================

  function handleSaveModel(
    model: MessageModel
  ) {
    const exists = models.some(
      (item) => item.id === model.id
    );

    let updatedModels: MessageModel[];

    if (editingModel) {
      // EDITAR
      updatedModels = models.map(
        (item) =>
          item.id === model.id
            ? model
            : item
      );
    } else {
      // CRIAR
      if (exists) {
        return;
      }

      updatedModels = [
        ...models,
        model,
      ];
    }

    onModelsChange(updatedModels);

    onModelSelect(model.id);

    setEditingModel(null);
  }




  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex gap-2"> <MessageCircle /> 
      Texto da Mensagem
      </h2>

      <div className="flex justify-between gap-4">

        <MessageAttachment
          attachment={attachment}
          onAttachmentChange={onAttachmentChange}
        />

        <div className="flex gap-4">
        <CreateModelDialog
          models={models}
          sending={sending}
          editingModel={editingModel}
          onCreate={handleSaveModel}
          onCancel={() => setEditingModel(null)}
        />

        <MessageModelSelect models={models}
          onModelSelect={onModelSelect}
          selectedModelId={selectedModelId}
          onModelsChange={onModelsChange}
          disabled={sending}
        />
        </div>
      </div>


      <MessageTextarea
        model={selectedModel}
        message={message}
        onMessageChange={setMessage}
        disabled={sending}
      />

      
    </section>
  );
}

