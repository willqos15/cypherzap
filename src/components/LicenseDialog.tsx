import { formatNumber } from "#lib/utils";
import type { Licenca } from "../types/Licensa";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

import {
  CheckCircle2,
  XCircle,
  CreditCard,
} from "lucide-react";


interface LicenseDialogProps {
  licenca: Licenca | null;
}

function formatarData(data: string | null): string {
  if (!data) {
    return "-";
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return data;
  }


  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function calcularTempoRestante(data: string | null): string {
  if (!data) {
    return "-";
  }

  const validade = new Date(data);

  if (Number.isNaN(validade.getTime())) {
    return "-";
  }

  const agora = new Date();

  if (validade <= agora) {
    const diferenca =
      agora.getTime() - validade.getTime();

    const dias = Math.floor(
      diferenca / (1000 * 60 * 60 * 24)
    );

    if (dias === 0) {
      return "Vencida hoje";
    }

    return `Vencida há ${dias} ${
      dias === 1 ? "dia" : "dias"
    }`;
  }

  let anos =
    validade.getFullYear() - agora.getFullYear();

  let meses =
    validade.getMonth() - agora.getMonth();

  let dias =
    validade.getDate() - agora.getDate();

  if (dias < 0) {
    meses--;

    const ultimoDiaMesAnterior = new Date(
      validade.getFullYear(),
      validade.getMonth(),
      0
    ).getDate();

    dias += ultimoDiaMesAnterior;
  }

  if (meses < 0) {
    anos--;
    meses += 12;
  }

  const partes: string[] = [];

  if (anos > 0) {
    partes.push(
      `${anos} ${anos === 1 ? "ano" : "anos"}`
    );
  }

  if (meses > 0) {
    partes.push(
      `${meses} ${meses === 1 ? "mês" : "meses"}`
    );
  }

  if (dias > 0) {
    partes.push(
      `${dias} ${dias === 1 ? "dia" : "dias"}`
    );
  }

  if (partes.length === 0) {
    return "Vence hoje";
  }

  if (partes.length === 1) {
    return partes[0];
  }

  if (partes.length === 2) {
    return `${partes[0]} e ${partes[1]}`;
  }

  return `${partes[0]}, ${partes[1]} e ${partes[2]}`;
}

export default function LicenseDialog({
  licenca,
}: LicenseDialogProps) {
  const autorizado = licenca?.autorizado ?? false;

  // Não possui licença cadastrada
  const semLicenca =
    !licenca || licenca.validade === null;

  const dataFormatada = formatarData(
    licenca?.validade ?? null
  );

  const tempoRestante = calcularTempoRestante(
    licenca?.validade ?? null
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition hover:bg-muted ${
              semLicenca
                ? "border-yellow-500/50"
                : ""
            }`}
          >
            {semLicenca ? (
              <>
                <CreditCard className="h-4 w-4 text-yellow-500" />

                <span className="text-sm font-medium">
                  Licença necessária
                </span>
              </>
            ) : autorizado ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />

                <span className="text-sm font-medium">
                  Licença ativa
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />

                <span className="text-sm font-medium">
                  Licença desativada
                </span>
              </>
            )}
          </button>
        }
      />

      <DialogContent className="sm:max-w-md">
        {semLicenca ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Licença necessária
              </DialogTitle>

            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-yellow-500" />

                <h3 className="font-semibold">
                  Ative sua licença
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Para utilizar todos os recursos do
                  sistema, é necessário adquirir uma
                  licença.
                </p>
              </div>


          <a href="https://wa.me/93991878598"
          target="_blank">
              <Button
                type="button"
                variant="secondary"
                className="font-bold w-full"
              >
                Adquirir licença
              </Button>
              </a>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                <h2 className="font-bold">Detalhes da licença</h2>
              </DialogTitle>


            </DialogHeader>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex gap-4 items-center rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">
                  Status
                </span>

                <div className="flex items-center gap-2">
                  {autorizado ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />

                      <span className="font-medium text-green-600">
                        Ativo
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />

                      <span className="font-medium text-red-600">
                        Desativado
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Número */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Número
                </p>

                <p className="mt-1 font-medium">
                  {formatNumber(licenca.numero)}
                </p>
              </div>

              {/* Validade */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Validade
                </p>

                <p className="mt-1 font-medium">
                  {dataFormatada}
                </p>
              </div>

              {/* Tempo restante */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  {autorizado
                    ? "Tempo restante"
                    : "Situação da validade"}
                </p>

                <p className="mt-1 font-medium">
                  {tempoRestante}
                </p>
              </div>

              {/* Motivo */}
              {!autorizado && licenca.motivo && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Motivo
                  </p>

                  <p className="mt-1 font-medium">
                    {licenca.motivo}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}