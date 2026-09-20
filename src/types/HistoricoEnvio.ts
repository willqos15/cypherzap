export type HistoricoEnvio = {
  id: number;
  lista_id: string;
  numero: string;
  status: "Sucesso" | "Falha" | "Espera em fila";
  data_hora: string;
  mensagem: string | null;
  erro: string | null;
};