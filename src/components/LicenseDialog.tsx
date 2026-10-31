import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

import { Input } from "./ui/input";
import { Button } from "./ui/button";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Monitor,
  CalendarDays,
  Clock,
} from "lucide-react";

type License = {
  autorizado: boolean;
  deviceId?: string;
  validade: string | null;
  motivo?: string | null;
  maxDevices?: number | null;
  usedDevices?: number | null;
  remainingDevices?: number | null;
};

type LicenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LicenseDialog({
  open,
  onOpenChange,
}: LicenseDialogProps) {
  const [license, setLicense] =
    useState<License | null>(null);

  const [licenseKey, setLicenseKey] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [trocandoLicenca, setTrocandoLicenca] =
    useState(false);

  useEffect(() => {
    carregarLicenca();

    const removerListener =
      window.whatsapp.onLicense((novaLicenca) => {
        console.log(
          "LICENÇA ATUALIZADA:",
          novaLicenca
        );

        setLicense(novaLicenca);

        if (novaLicenca?.autorizado) {
          setSuccess(false);
          setError("");
        }
      });

    return removerListener;
  }, []);

  async function carregarLicenca() {
    try {
      const resultado =
        await window.whatsapp.getLicense();

      console.log(
        "LICENÇA RECUPERADA:",
        resultado
      );

      setLicense(resultado);

      const key =
        await window.whatsapp.getLicenseKey();

      if (key) {
        setLicenseKey(key);
      }
    } catch (error) {
      console.error(
        "Erro ao carregar licença:",
        error
      );
    }
  }

  function extrairMensagemErro(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Mensagem original do erro:",
      message
    );

    const partes = message.split("Error:");

    if (partes.length > 1) {
      return partes[partes.length - 1].trim();
    }

    return (
      message ||
      "Não foi possível validar a licença."
    );
  }

  function calcularDiasRestantes() {
    if (!license?.validade) {
      return null;
    }

    const agora = new Date();

    const validade =
      new Date(license.validade);

    const diferenca =
      validade.getTime() -
      agora.getTime();

    const dias = Math.ceil(
      diferenca /
        (1000 * 60 * 60 * 24)
    );

    return Math.max(dias, 0);
  }

  function formatarDataValidade() {
    if (!license?.validade) {
      return "Sem validade";
    }

    return new Date(
      license.validade
    ).toLocaleDateString("pt-BR");
  }



  async function iniciarTrocaLicenca() {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const licencaAtualizada =
        await window.whatsapp.getLicense();

      console.log(
        "LICENÇA VERIFICADA ANTES DO CADASTRO:",
        licencaAtualizada
      );

      setLicense(licencaAtualizada);

      const expirada =
        !!licencaAtualizada?.validade &&
        new Date(
          licencaAtualizada.validade
        ) <= new Date();

      const podeCadastrar =
        licencaAtualizada?.autorizado ||
        expirada;

      if (!podeCadastrar) {
        setError(
          licencaAtualizada?.motivo ||
            "A licença atual não permite cadastrar outra licença."
        );

        return;
      }

      setTrocandoLicenca(true);
      setLicenseKey("");
    } catch (error) {
      console.error(
        "Erro ao verificar licença antes do cadastro:",
        error
      );

      setError(
        extrairMensagemErro(error)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const key =
      licenseKey.trim();

    if (!key) {
      setError(
        "Informe a chave da licença."
      );

      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const resultado =
        await window.whatsapp.saveLicense(
          key
        );

      console.log(
        "RESULTADO DA NOVA LICENÇA:",
        resultado
      );

      /*
       * Uma licença só é substituída
       * se o cadastro for aceito.
       */
      if (!resultado) {
        setError(
          "Não foi possível cadastrar a licença."
        );

        return;
      }

      /*
       * Licença válida:
       * substitui a licença anterior.
       */
      if (resultado.autorizado) {
        setLicense(resultado);

        setSuccess(true);

        setTrocandoLicenca(false);

        return;
      }

      /*
       * Licença expirada:
       * também será cadastrada.
       *
       * O Worker precisa devolver:
       * valid: false
       * expires_at: data da expiração
       * max_devices: limite de dispositivos
       * error: "Licença expirada"
       */
      const novaLicencaExpirada =
        !!resultado.validade &&
        new Date(resultado.validade) <= new Date();

      if (novaLicencaExpirada) {
        setLicense(resultado);

        setSuccess(true);

        setTrocandoLicenca(false);

        return;
      }

      /*
       * Outra licença inválida:
       * mantém a licença anterior.
       */
      setError(
        resultado.motivo ||
          "A licença informada não é válida."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar licença:",
        error
      );

      const message =
        extrairMensagemErro(error);

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const diasRestantes =
    calcularDiasRestantes();

  const licenseAtiva =
    license?.autorizado === true;

  const licenseExpirada =
    !!license?.validade &&
    new Date(license.validade) <= new Date();


  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
<DialogTrigger
  render={
    <Button
      type="button"
      variant="outline"
    >
      {licenseAtiva ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
          Licença ativa
        </>
      ) : licenseExpirada ? (
        <>
          <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
          Licença expirada
        </>
      ) : (
        <>
          <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
          Sem licença
        </>
      )}
    </Button>
  }
/>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
  <DialogTitle className="flex items-center gap-2">
  {licenseAtiva &&
  !trocandoLicenca ? (
    <>
      <CheckCircle2 className="h-5 w-5 text-green-500" />
      Licença ativa
    </>
  ) : licenseExpirada &&
    !trocandoLicenca ? (
    <>
      <AlertCircle className="h-5 w-5 text-yellow-500" />
      Licença expirada
    </>
  ) : (
    <>
      <AlertCircle className="h-5 w-5 text-red-500" />
      Cadastrar licença
    </>
  )}
</DialogTitle>

          <DialogDescription>
            {licenseAtiva &&
            !trocandoLicenca
              ? "Confira os detalhes da licença deste dispositivo."
              : licenseExpirada &&
                !trocandoLicenca
              ? "A licença deste dispositivo está expirada."
              : "Informe a chave da licença para cadastrar neste dispositivo."}
          </DialogDescription>
        </DialogHeader>

        {(licenseAtiva || licenseExpirada) &&
        !trocandoLicenca ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border p-3">
              <CalendarDays className="h-5 w-5" />

              <div>
                <p className="text-sm font-medium">
                  Validade
                </p>

                <p className="text-sm text-muted-foreground">
                  {formatarDataValidade()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border p-3">
              <Clock className="h-5 w-5" />

              <div>
                <p className="text-sm font-medium">
                  Tempo restante
                </p>

                <p className="text-sm text-muted-foreground">
                  {diasRestantes === null
                    ? "Sem validade"
                    : diasRestantes === 1
                    ? "1 dia restante"
                    : `${diasRestantes} dias restantes`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border p-3">
              <Monitor className="h-5 w-5" />

              <div>
  <p className="text-sm text-muted-foreground">
    Computadores
  </p>

  <p className="font-medium">
    {license?.usedDevices ?? 0} / {license?.maxDevices ?? 0}
  </p>

  <p className="text-xs text-muted-foreground">
    {license?.remainingDevices ?? 0} disponível
    {license?.remainingDevices !== 1 ? "is" : ""}
  </p>
</div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={iniciarTrocaLicenca}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Mudar licença"
              )}
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                value={licenseKey}
                onChange={(event) => {
                  setLicenseKey(
                    event.target.value
                  );

                  setError("");
                  setSuccess(false);
                }}
                placeholder="Digite sua chave de licença"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />

                <span>
                  Licença cadastrada com sucesso!
                </span>
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={
                loading ||
                !licenseKey.trim()
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar licença"
              )}
            </Button>

            {(licenseAtiva ||
              licenseExpirada) &&
              trocandoLicenca && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setTrocandoLicenca(false);
                    setError("");
                    setSuccess(false);
                    setLicenseKey("");
                  }}
                >
                  Voltar para detalhes
                </Button>
              )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}