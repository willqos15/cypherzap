export interface Licenca {
  autorizado: boolean;
  deviceId?: string;
  validade: string | null;
  motivo?: string | null;
  maxDevices?: number | null;
  usedDevices?: number | null;
  remainingDevices?: number | null;
}