export interface Licenca {
  autorizado: boolean;
  numero: string;
  validade: string | null;
  motivo?: string;
}