export type AttachmentType =
  | "image"
  | "video"
  | "audio"
  | "document"

export type MessageAttachmentData =  {
  file: File;
  type: AttachmentType;
} 