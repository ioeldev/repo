import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "../ui/button";
import { useTradingForm } from "@/contexts/TradingFormContext";

export function AdjustLeverageDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { t } = useTranslation();
    const { state, setLeverage } = useTradingForm();
    const [leverage, setLeverageState] = useState([state.leverage]);

    // Sync local state with context when dialog opens
    useEffect(() => {
        if (open) {
            setLeverageState([state.leverage]);
        }
    }, [open, state.leverage]);

    const quickLeverageValues = [1, 5, 10, 20, 50, 100];

    const handleLeverageChange = (value: number[]) => {
        setLeverageState(value);
    };

    const handleQuickSelect = (value: number) => {
        setLeverageState([value]);
    };

    const handleConfirm = () => {
        setLeverage(leverage[0]);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t("user.leverage.title")}</DialogTitle>
                    <DialogDescription>{t("user.leverage.warning")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Leverage Display */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="text-5xl font-bold tracking-tight">{leverage[0]}x</div>
                        <p className="text-sm text-muted-foreground">{t("user.leverage.current")}</p>
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                            {t("user.leverage.quickSelect")}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {quickLeverageValues.map((value) => (
                                <Button
                                    key={value}
                                    variant={leverage[0] === value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleQuickSelect(value)}
                                    className="text-xs"
                                >
                                    {value}x
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>1x</span>
                            <span>100x</span>
                        </div>
                        <Slider
                            value={leverage}
                            onValueChange={handleLeverageChange}
                            min={1}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t("user.leverage.min")}</span>
                            <span>{t("user.leverage.max")}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleConfirm} className="w-full sm:w-auto">
                        {t("common.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
