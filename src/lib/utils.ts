import { clsx, type ClassValue } from "clsx"

import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {

  return twMerge(clsx(inputs))

}

export function normalizePhone(value: unknown): string {

  let clean = String(value ?? "").replace(/\D/g, "");

  if (!clean) {

    return "";

  }

  // Remove o código do Brasil

  if (clean.startsWith("55")) {

    clean = clean.slice(2);

  }

  // Deve ser DDD + telefone

  if (clean.length !== 10 && clean.length !== 11) {

    return "";

  }

  const ddd = clean.slice(0, 2);

  const phone = clean.slice(2);

  // Celular antigo sem o 9

  // Ex.: 93 91878598

  //      ↓

  //     93 991878598

  if (

    phone.length === 8 &&

    phone.startsWith("9")

  ) {

    return `55${ddd}9${phone}`;

  }

  // Celular já com o 9

  // Ex.: 93 991878598

  if (

    phone.length === 9 &&

    phone.startsWith("9")

  ) {

    return `55${ddd}${phone}`;

  }

  // Telefone fixo

  if (phone.length === 8) {

    return `55${ddd}${phone}`;

  }

  return "";

}


export function formatNumber(value: string): string {
    const clean = value.replace(/\D/g, "");

    /**
     * Celular:
     * +55 (93) 99187-8598
     */
    if (clean.length === 13) {
      return `+55 (${clean.slice(
        2,
        4
      )}) ${clean.slice(
        4,
        9
      )}-${clean.slice(9)}`;
    }

    /**
     * Fixo:
     * +55 (93) 9918-7859
     */
    if (clean.length === 12) {
      return `+55 (${clean.slice(
        2,
        4
      )}) ${clean.slice(
        4,
        8
      )}-${clean.slice(8)}`;
    }

    return value;
  }