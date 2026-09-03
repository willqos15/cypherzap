interface Licenca {
  autorizado: boolean;
  numero: string;
  validade: string | null;
  motivo?: string;
}


export { };

declare global {

  interface Window {

    whatsapp: {

      onQR(
        callback: (
          qr: string | null
        ) => void
      ): void;



      onStatus(
        callback: (
          status: WhatsAppStatus
        ) => void
      ): void;


      getLicense(): Promise<Licenca | null>;

      onLicense: (
        callback: (license: Licenca) => void
      ) => () => void;

      enviarMensagem(
        number: string,
        message: string,
        attachment?: {
          type:
          | "image"
          | "video"
          | "audio"
          | "document";
          buffer: ArrayBuffer;
          fileName: string;
          mimetype: string;
        }
      ): Promise<boolean>;

      desconectar(): Promise<boolean>;

      getStatus(): Promise<string>;



    };

  }

}