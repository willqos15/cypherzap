import { formatNumber, normalizePhone } from "#lib/utils";
import { useRef, useState } from "react";

type Props = {
  numbers: string[];
  disabled?: boolean;
  onNumbersChange: (numbers: string[]) => void;
};

export default function NumberInput({
  numbers,
  disabled = false,
  onNumbersChange,
}: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  


  function addNumbers(value: string) {
    setError("");

    const values = value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (values.length === 0) {
      return;
    }

    const normalizedNumbers: string[] = [];

    let invalidCount = 0;

    /**
     * Normaliza e valida os números recebidos.
     */
    for (const value of values) {
      const normalized = normalizePhone(value);

      if (!normalized) {
        invalidCount++;
        continue;
      }

      normalizedNumbers.push(normalized);
    }

    /**
     * Mostra erro para números inválidos.
     */
    if (invalidCount > 0) {
      setError(
        `${invalidCount} número${
          invalidCount !== 1 ? "s" : ""
        } inválido${
          invalidCount !== 1 ? "s" : ""
        }.`
      );
    }

    /**
     * Normaliza os números existentes
     * para comparar corretamente.
     */
    const existingNumbers = new Set(
      numbers
        .map((number) =>
          normalizePhone(number)
        )
        .filter(Boolean)
    );

    /**
     * Evita duplicados na própria entrada.
     */
    const addedNumbers = new Set<string>();

    const uniqueNumbers: string[] = [];

    for (const number of normalizedNumbers) {
      /**
       * Já existe na lista.
       */
      if (existingNumbers.has(number)) {
        continue;
      }

      /**
       * Já foi colocado nessa entrada.
       */
      if (addedNumbers.has(number)) {
        continue;
      }

      addedNumbers.add(number);
      uniqueNumbers.push(number);
    }

    if (uniqueNumbers.length > 0) {
      onNumbersChange([
        ...numbers,
        ...uniqueNumbers,
      ]);
    }

    setInput("");
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" ||
      event.key === ","
    ) {
      event.preventDefault();

      addNumbers(input);

      return;
    }

    if (
      event.key === "Backspace" &&
      input === "" &&
      numbers.length > 0
    ) {
      onNumbersChange(
        numbers.slice(0, -1)
      );
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;

    if (/[\n,]/.test(value)) {
      addNumbers(value);
      return;
    }

    setInput(value);

    if (error) {
      setError("");
    }
  }

  function removeNumber(index: number) {
    onNumbersChange(
      numbers.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    );

    inputRef.current?.focus();
  }

  return (
    <div>
      <div
        onClick={() =>
          inputRef.current?.focus()
        }
        className={`
          flex min-h-11.25 max-h-40 overflow-y-scroll flex-wrap items-center gap-1.5
          rounded-md border border-gray-300 p-2
          ${
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-text"
          }
        `}
      >
        {numbers.map((number, index) => (
          <span
            key={`${number}-${index}`}
            className="
              inline-flex items-center gap-1.5
              rounded bg-gray-100
              px-2 py-1.25
              text-sm
            "
          >
            {formatNumber(number)}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeNumber(index);
              }}
              disabled={disabled}
              className="
                cursor-pointer
                border-0 bg-transparent
                p-0
                text-base leading-none
                hover:text-red-500
                disabled:cursor-not-allowed
              "
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={input}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            numbers.length === 0
              ? "Digite um número e pressione Enter ou Vírgula..."
              : "Adicionar número..."
          }
          className="
            min-w-45 flex-1
            border-0
            bg-transparent
            p-1.25
            outline-none
            focus:ring-0
            disabled:cursor-not-allowed
          "
        />
      </div>

      {error && (
        <p className="mt-1 px-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

