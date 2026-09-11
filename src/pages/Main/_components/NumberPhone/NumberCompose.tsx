import ExcelImportNumber from "./ExcelImportNumber";
import NumberInput from "./NumberInput";

type NumberComposeProps = {
    numbers: string[];
    setNumbers: (numbers: string[]) => void;
    disabled?: boolean;
};

export default function NumberCompose({ numbers, setNumbers, disabled }: NumberComposeProps) {

    
    return (<>
        <ExcelImportNumber
            numbers={numbers}
            onNumbersChange={setNumbers}
        />

        <NumberInput
            numbers={numbers}
            disabled={disabled}
            onNumbersChange={setNumbers}
        />
    </>)
}