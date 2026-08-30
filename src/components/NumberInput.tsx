import { useRef, useState } from "react";

type Props = {
numbers: string[];
disabled?: boolean;
onNumbersChange: (numbers: string[]) => void;
};

export default function NumberInput({
numbers,
disabled = false,
onNumbersChange
}: Props) {
const [input, setInput] = useState("");
const inputRef = useRef<HTMLInputElement>(null);

function normalizeNumber(value: string) {
return value.replace(/\D/g, "");
}

function addNumbers(value: string) {
const newNumbers = value
.split(/[\n,]+/)
.map(normalizeNumber)
.filter(Boolean);


if (newNumbers.length === 0) {
  return;
}

const uniqueNumbers = newNumbers.filter(
  (number) => !numbers.includes(number)
);

if (uniqueNumbers.length > 0) {
  onNumbersChange([
    ...numbers,
    ...uniqueNumbers
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

return ( <div> <label>
Contatos </label>

```
  <div
    onClick={() =>
      inputRef.current?.focus()
    }
    style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      minHeight: 45,
      padding: 8,
      border: "1px solid #ccc",
      borderRadius: 6,
      cursor: disabled
        ? "not-allowed"
        : "text"
    }}
  >
    {numbers.map(
      (number, index) => (
        <span
          key={`${number}-${index}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            background: "#eee",
            borderRadius: 5,
            fontSize: 14
          }}
        >
          {number}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeNumber(index);
            }}
            disabled={disabled}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              fontSize: 16
            }}
          >
            ×
          </button>
        </span>
      )
    )}

    <input
      ref={inputRef}
      type="text"
      value={input}
      disabled={disabled}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={
        numbers.length === 0
          ? "Digite o número e pressione Enter..."
          : "Adicionar número..."
      }
      style={{
        flex: 1,
        minWidth: 180,
        border: "none",
        outline: "none",
        padding: 5
      }}
    />
  </div>

  <small>
    Digite um número e pressione Enter ou vírgula para adicionar.
  </small>
</div>


);
}
