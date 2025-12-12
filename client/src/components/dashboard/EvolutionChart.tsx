"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { usePnLHistory } from "@/hooks/usePnLHistory";
import { useCurrency } from "@/hooks/useCurrency";

const chartConfig = {
    pnl: {
        label: "P&L",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

export function EvolutionChart() {
    const navigate = useNavigate();
    const { data: chartData, isLoading } = usePnLHistory();
    const { formatAmount } = useCurrency();

    const total = React.useMemo(() => chartData[chartData.length - 1]?.pnl || 0, [chartData]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-col items-stretch border-b p-0">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                    <CardTitle>Profit & Loss Evolution</CardTitle>
                    <CardDescription>Track your trading performance over time</CardDescription>
                </div>
                <div className="flex border-t">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:px-8 sm:py-5">
                        <span className="text-muted-foreground text-xs">Total P&L</span>
                        <span className="text-lg leading-none font-bold sm:text-3xl">
                            {formatAmount(total, "EUR")}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col px-2 pt-4 sm:p-6">
                <div className="flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[250px]">
                            <p className="text-muted-foreground">Loading chart data...</p>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="flex items-center justify-center h-[250px]">
                            <p className="text-muted-foreground">No trading history yet. Start trading to see your P&L evolution.</p>
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                            <LineChart
                                accessibilityLayer
                                data={chartData}
                                margin={{
                                    left: 12,
                                    right: 12,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        });
                                    }}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="w-[150px]"
                                            labelFormatter={(value) => {
                                                return new Date(value).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                });
                                            }}
                                            formatter={(value) => {
                                                return formatAmount(Number(value), "EUR");
                                            }}
                                        />
                                    }
                                />
                                <Line
                                    dataKey="pnl"
                                    type="monotone"
                                    stroke={"var(--color-chart-1)"}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>

            <CardFooter>
                <Button onClick={() => navigate("/trading")} className="w-full mt-auto">
                    Go to Markets
                </Button>
            </CardFooter>
        </Card>
    );
}
