import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

interface ValueInputProps {
    value?: number;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    placeholder?: string;
}

export function ValueInput({
    value: propValue,
    onChange,
    min = 0,
    max = 1000,
    step = 0.001, // Allow fine decimal precision for crypto
    label = "Value",
    placeholder = "0.00",
}: ValueInputProps) {
    const [internalValue, setInternalValue] = useState(propValue || 0);
    // Initialize with exact value preserving precision
    const [inputValue, setInputValue] = useState((propValue || 0) === 0 ? "0" : (propValue || 0).toString());

    // Use controlled value if provided, otherwise use internal state
    const currentValue = propValue !== undefined ? propValue : internalValue;

    // Sync inputValue when propValue changes from outside
    useEffect(() => {
        if (propValue !== undefined) {
            // Only update if the value is different from what we have
            // This prevents overwriting user input while typing
            const currentNumValue = parseFloat(inputValue) || 0;
            if (Math.abs(propValue - currentNumValue) > 0.00000001) {
                // Keep the exact precision without rounding
                setInputValue(propValue === 0 ? "0" : propValue.toString());
            }
        }
    }, [propValue, inputValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputStr = e.target.value;

        // Allow empty string, numbers with decimals, and numbers ending with decimal point
        if (inputStr === "" || inputStr === "." || /^\d*\.?\d*$/.test(inputStr)) {
            setInputValue(inputStr);

            const newValue = parseFloat(inputStr) || 0;

            // Only update the actual value if it's a valid number greater than 0
            if (!isNaN(newValue) && newValue > 0) {
                // Don't round - preserve the exact value for crypto precision
                const clampedValue = Math.min(max, newValue);

                if (propValue !== undefined && onChange) {
                    onChange(clampedValue);
                } else {
                    setInternalValue(clampedValue);
                }
            } else if (inputStr === "" || newValue === 0) {
                // Handle empty or zero input
                if (propValue !== undefined && onChange) {
                    onChange(0);
                } else {
                    setInternalValue(0);
                }
            }
        }
    };

    const handleInputBlur = () => {
        // On blur, format the display value
        const numValue = parseFloat(inputValue) || 0;
        // Don't force rounding - preserve the precision the user entered
        const clampedValue = numValue > 0 ? Math.min(max, numValue) : 0;

        // Format the display to remove trailing zeros but keep necessary precision
        setInputValue(clampedValue === 0 ? "0" : clampedValue.toString());

        if (propValue !== undefined && onChange) {
            onChange(clampedValue);
        } else {
            setInternalValue(clampedValue);
        }
    };

    const handleSliderChange = (values: number[]) => {
        // Keep the exact value from the slider
        const newValue = values[0];
        // Display the value naturally without forcing decimal places
        setInputValue(newValue === 0 ? "0" : newValue.toString());
        if (propValue !== undefined && onChange) {
            onChange(newValue);
        } else {
            setInternalValue(newValue);
        }
    };

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <Label className="block text-[9px] lg:text-xs font-bold lg:font-medium text-muted-foreground uppercase lg:uppercase mb-1.5 lg:mb-1">
                    {label}
                </Label>
                <Input
                    type="text" // Changed to text to allow better control
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-md bg-muted/50 lg:bg-muted border border-border lg:border-muted-foreground/20 text-xs lg:text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 lg:focus:ring-primary focus:border-primary transition"
                />
            </div>
            <Slider
                value={[currentValue]}
                onValueChange={handleSliderChange}
                min={min}
                max={max}
                step={step}
                className="w-full"
            />
        </div>
    );
}
