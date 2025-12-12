"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useCurrency } from "@/hooks/useCurrency";

const chartConfig = {
    trading: {
        label: "Trading",
        color: "var(--color-chart-1)",
    },
    robots: {
        label: "Robots",
        color: "var(--color-chart-2)",
    },
    invest: {
        label: "Invest",
        color: "var(--color-chart-3)",
    },
} satisfies ChartConfig;

export function BalanceBreakdown() {
    const navigate = useNavigate();
    const { summary } = useDashboardSummary();
    const { formatAmount } = useCurrency();

    const chartData = React.useMemo(
        () =>
            [
                {
                    category: "trading",
                    value: summary.trading.total_balance,
                    fill: "var(--color-chart-1)",
                },
                {
                    category: "robots",
                    value: summary.robots.total_balance,
                    fill: "var(--color-chart-2)",
                },
                {
                    category: "invest",
                    value: summary.investments.total_balance,
                    fill: "var(--color-chart-3)",
                },
            ].filter((item) => item.value > 0),
        [summary]
    );

    const totalBalance = React.useMemo(() => summary.portfolio.total_balance, [summary.portfolio.total_balance]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-col items-stretch border-b p-0">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                    <CardTitle>Balance Breakdown</CardTitle>
                    <CardDescription>Distribution across your accounts</CardDescription>
                </div>
                <div className="flex border-t">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:px-8 sm:py-5">
                        <span className="text-muted-foreground text-xs">Total Balance</span>
                        <span className="text-lg leading-none font-bold sm:text-3xl">
                            {formatAmount(totalBalance, "EUR")}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <>
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                            <PieChart>
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) => {
                                                return `€${Number(value).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}`;
                                            }}
                                        />
                                    }
                                />
                                <Pie data={chartData} dataKey="value" nameKey="category" innerRadius={60} />
                            </PieChart>
                        </ChartContainer>

                        <div className="space-y-2 text-sm mt-6">
                            {chartData.map((item) => (
                                <div key={item.category} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                        <span className="capitalize">
                                            {chartConfig[item.category as keyof typeof chartConfig].label}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-foreground">
                                        €
                                        {item.value.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No funds invested yet</p>
                        <Button onClick={() => navigate("/trading")} size="sm" className="mx-auto">
                            Start Trading
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="secondary" className="w-full mt-auto" onClick={() => navigate("/settings")}>
                    Manage Accounts
                </Button>
            </CardFooter>
        </Card>
    );
}
