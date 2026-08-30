export type SendStatus =
| "waiting"
| "sending"
| "success"
| "error";

export type ContactStatus = {
[id: number]: SendStatus;
};
