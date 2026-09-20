import type { MessageAttachmentData } from "./Attachment";

export type MessageVariant = {
  id: string;
  texto: string;
};

export type MessageModel = {
  id: string;
  titulo: string;
  variantes: MessageVariant[];
  attachment?: MessageAttachmentData | null;

  
};

