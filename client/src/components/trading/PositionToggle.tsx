import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";

interface PositionToggleProps {
    value: "long" | "short";
    onChange: (value: "long" | "short") => void;
    label?: string;
}

export function PositionToggle({ value, onChange, label = "Position" }: PositionToggleProps) {
    return (
        <div className="space-y-2">
            <Label className="text-[9px] lg:text-xs text-muted-foreground uppercase lg:uppercase">{label}</Label>
            <div className="relative grid grid-cols-2 gap-2 border rounded-lg p-1 overflow-hidden transition-colors duration-200">
                {/* Sliding background "switch" effect */}
                <span
                    className={cn(
                        "absolute top-1 bottom-1 rounded-md z-0 transition-all duration-200 pointer-events-none",
                        value === "long" ? "bg-green-500/30" : "bg-red-500/30"
                    )}
                    style={{
                        left: "0.25rem",
                        width: "calc(50% - 0.375rem)",
                        transform: value === "long" ? "translateX(0)" : "translateX(calc(100% + 0.5rem))",
                    }}
                />
                <Button
                    className={cn(
                        "relative z-10 bg-transparent hover:bg-transparent text-foreground font-semibold transition-colors duration-200",
                        value === "long" ? "shadow-none" : "opacity-70"
                    )}
                    onClick={() => onChange("long")}
                >
                    Long
                </Button>
                <Button
                    className={cn(
                        "relative z-10 bg-transparent hover:bg-transparent text-foreground font-semibold transition-colors duration-200",
                        value === "short" ? "shadow-none" : "opacity-70"
                    )}
                    onClick={() => onChange("short")}
                >
                    Short
                </Button>
            </div>
        </div>
    );
}
