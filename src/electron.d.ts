interface Licenca {
  autorizado: boolean;
  deviceId?: string;
  validade: string | null;
  motivo?: string | null;
  maxDevices?: number | null;
}


export { };

declare global {

  interface Window {

    whatsapp: {

      invoke: (
        channel: string,
        ...args: unknown[]
      ) => Promise<any>;

      on: (
        channel: string,
        callback: (...args: any[]) => void
      ) => () => void;

      onQR: (callback: (qr: string) => void) => () => void;

      onStatus: (
        callback: (status: string) => void
      ) => () => void;

      obterHistoricoEnvios(): Promise<
        HistoricoEnvio[]
      >;


      getLicense(): Promise<Licenca | null>;

      getLicenseKey: () => Promise<string | null>;

       saveLicense: (
        key: string
      ) => Promise<Licenca>;

      onLicense: (
        callback: (license: Licenca) => void
      ) => () => void;

      enviarMensagem(
        number: string,
        message: string,
        attachment: {
          type:
          | "image"
          | "video"
          | "audio"
          | "document";
          buffer: ArrayBuffer;
          fileName: string;
          mimetype: string;
        } | undefined,
        listaId: string,
        historicoId: number
      ): Promise<boolean>;

      onHistoricoEnvioAtualizado: (
        callback: (dados: {
          id: number;
          status: string;
          erro: string | null;
          data_hora: string;
        }) => void
      ) => () => void;

      registrarPendentes(
        listaId: string,
        numeros: string[],
        mensagens: string[]
      ): Promise<{
        numero: string;
        id: number;
      }[]>;

      onWhatsappSessionChanged: (
        callback: (numero: string | null) => void
      ) => () => void;

      desconectar(): Promise<boolean>;

      getStatus(): Promise<string>;


      getWhatsAppGroups(): Promise<{
        id: string;
        title: string;
      }[]>;

      exportGroupNumbers(
        groupId: string
      ): Promise<{
        name: string;
        number: string;
      }[]>;


      onContactsCount: (
        callback: (count: number) => void
      ) => () => void;

      exportContacts(): Promise<{
        name: string;
        number: string;
      }[]>;


      getContactsCount: () => Promise<number>;


      exportAllGroupNumbers: () => Promise<GroupContact[]>;

    };

  }

} 