
import { useEffect, useState } from "react";

import type { MessageModel } from "../../../../types/MessageModel";

import CreateModelDialog from "../ModelMessage/CreateModelDialog";
import { MessageCircle } from "lucide-react";
import MessageModelSelect from "../ModelMessage/MessageModelSelect";
import MessageTextarea from "./MessageTextArea";

type Props = {
  models: MessageModel[];
  selectedModelId: string | null;
  sending: boolean;
  message: string;
  setMessage: (value: string) => void;

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
  setMessage
}: Props) {

  



  const selectedModel =
    models.find(
      (model) =>
        model.id === selectedModelId
    ) ?? null;

  useEffect(() => {
    if (selectedModelId === null) {
      setMessage("");
      return;
    }

    const model = models.find(
      (item) => item.id === selectedModelId
    );

    if (!model) {
      setMessage("");
      return;
    }

    setMessage(model.variantes[0]?.texto ?? "");
  }, [selectedModelId]);

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
    <section className="flex flex-col gap-2">
      <h2 className="flex gap-2"> <MessageCircle /> Texto da Mensagem</h2>

      <MessageTextarea
        model={selectedModel}
        message={message}
        onMessageChange={setMessage}
        disabled={sending}
      />

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

    </section>
  );
}

