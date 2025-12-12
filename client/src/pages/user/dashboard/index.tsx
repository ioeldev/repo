import { useUserInfo } from "@/hooks/useAuth";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { usePositionStats } from "@/hooks/usePositionStats";
import { useCurrency } from "@/hooks/useCurrency";
import { StatCard, FullWidthStatCard } from "@/components/dashboard/StatCard";
import { BalanceBreakdown } from "@/components/dashboard/BalanceBreakdown";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DollarSign, TrendingUp, ActivityIcon, AlertCircle, TrendingDown } from "lucide-react";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { usePositions } from "@/hooks/usePositions";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function UserDashboard() {
    const { user } = useUserInfo();
    const { summary } = useDashboardSummary();
    const { balances } = usePositionStats();
    const { formatAmount } = useCurrency();
    const { positions } = usePositions(1, 10);

    const navigate = useNavigate();

    const balanceBreakdown = (
        <div className="space-y-2">
            <div className="flex gap-3 text-sm text-muted-foreground">
                <span>BTC:</span>
                <span className="font-medium">{balances.btc.toFixed(8)}</span>
            </div>
            <div className="flex gap-3 text-sm text-muted-foreground">
                <span>USDT:</span>
                <span className="font-medium">{formatAmount(balances.usdt, "USD")}</span>
            </div>
            <div className="flex gap-3 text-sm text-muted-foreground">
                <span>EUR:</span>
                <span className="font-medium">{formatAmount(balances.eur, "EUR")}</span>
            </div>
        </div>
    );

    // Get the source currency from the summary data (backend specifies what currency these values are in)
    const sourceCurrency = (summary as any).currency || "USD";

    const stats = [
        {
            title: "Trading",
            value: formatAmount(summary.trading.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        },
        {
            title: "Robots",
            value: formatAmount(summary.robots.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <ActivityIcon className="h-5 w-5 text-purple-500" />,
        },
        {
            title: "Investments",
            value: formatAmount(summary.investments.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <DollarSign className="h-5 w-5 text-orange-500" />,
        },
        {
            title: "Performance",
            value: formatAmount(summary.portfolio.total_performance, sourceCurrency as "USD" | "EUR"),
            icon: (
                <TrendingDown
                    className={`h-5 w-5 ${
                        summary.portfolio.total_performance >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                />
            ),
        },
    ];

    return (
        <div className="space-y-8 container max-w-full px-4 md:px-6 lg:px-8 py-6">
            {/* Welcome Banner */}
            {user && user.custom_message && (
                <Alert className="bg-gradient-primary shadow-sm">
                    <AlertCircle className="text-primary" />
                    <AlertTitle className="text-foreground">{user.custom_message}</AlertTitle>
                </Alert>
            )}

            {/* Total Balance Card - Full Width */}
            <FullWidthStatCard
                title="Total Balance"
                value={formatAmount(summary.portfolio.total_balance, sourceCurrency as "USD" | "EUR")}
                subValue={balanceBreakdown}
            />

            {/* Other Stats Cards - Horizontal Scroll on Mobile */}
            <div>
                <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-4">
                        {stats.map((stat) => (
                            <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} />
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <BalanceBreakdown />

                {/* Right Column */}
                <EvolutionChart />
            </div>

            {/* Recent Activity Section */}
            <Card className="p-6 theme-card">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Positions</h3>
                <PositionsTable positions={positions} />

                {/* add a "View all button" */}
                <div className="flex justify-center mt-4">
                    <Button onClick={() => navigate("/positions")}>View All Positions</Button>
                </div>
            </Card>
        </div>
    );
}
