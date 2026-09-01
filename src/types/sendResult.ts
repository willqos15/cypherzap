export type SendResult = {
  number: string;
  status: "success" | "failed";
  sentAt: Date;
  message?: string;
  error?: string;
};