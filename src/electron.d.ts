export {};

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
          status: string
        ) => void
      ): void;

      enviarMensagem(
        number: string,
        message: string
      ): Promise<boolean>;

      desconectar(): Promise<boolean>;

      getStatus(): Promise<string>;

    };

  }

}