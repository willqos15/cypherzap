export type SendStatus =
  | "waiting"
  | "sending"
  | "success"
  | "error";

export type ContactStatus = {
  [id: number]: SendStatus;
};

export type QueueSettings = {
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  pauseEvery: number;
  pauseDurationSeconds: number;
};