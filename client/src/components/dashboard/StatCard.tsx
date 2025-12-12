import { Card } from "@/components/ui/card";
import { type ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    subValue?: ReactNode;
    color?: string;
}

export function StatCard({ title, value, subValue }: StatCardProps) {
    return (
        <Card className="p-5 min-w-[250px] shrink-0 last:mr-0">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
                    <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
                    {subValue && <div className="mt-3 text-xs">{subValue}</div>}
                </div>
                {/* {icon && <div className="ml-4 shrink-0 opacity-80">{icon}</div>} */}
            </div>
        </Card>
    );
}

export function FullWidthStatCard({ title, value, subValue }: Omit<StatCardProps, "icon" | "color">) {
    return (
        <Card className="p-5 w-full">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
                    <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
                    {subValue && <div className="mt-4 text-xs">{subValue}</div>}
                </div>
            </div>
        </Card>
    );
}
