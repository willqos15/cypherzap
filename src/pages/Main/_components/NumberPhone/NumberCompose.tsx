import ExcelImportNumber from "./ExcelImportNumber";
import NumberInput from "./NumberInput";

type NumberComposeProps = {
    numbers: string[];
    setNumbers: (numbers: string[]) => void;
    disabled?: boolean;
    onClearNumbers: () => void;

};

export default function NumberCompose({ numbers, setNumbers, disabled, onClearNumbers}: NumberComposeProps) {

    
    return (<>
        <ExcelImportNumber
            numbers={numbers}
            onNumbersChange={setNumbers}
            onClearNumbers={onClearNumbers}

        />

        <NumberInput
            numbers={numbers}
            disabled={disabled}
            onNumbersChange={setNumbers}
        />
    </>)
}