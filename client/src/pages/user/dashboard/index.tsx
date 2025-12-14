import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserInfo } from "@/hooks/useAuth";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { usePositionStats } from "@/hooks/usePositionStats";
import { useCurrency } from "@/hooks/useCurrency";
import { usePairs } from "@/hooks/usePairs";
import { StatCard, FullWidthStatCard } from "@/components/dashboard/StatCard";
import { BalanceBreakdown } from "@/components/dashboard/BalanceBreakdown";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    DollarSign,
    TrendingUp,
    ActivityIcon,
    AlertCircle,
    TrendingDown,
    ArrowLeftRight,
    ArrowDownToLine,
    ArrowUpFromLine,
} from "lucide-react";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { usePositions } from "@/hooks/usePositions";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { ConvertDialog } from "@/components/user/dialogs/ConvertDialog";
import { DepositDialog } from "@/components/user/dialogs/DepositDialog";
import { WithdrawDialog } from "@/components/user/dialogs/WithdrawDialog";
import { DepositsWithdrawsTable } from "@/components/user/DepositsWithdrawsTable";

export default function UserDashboard() {
    const { t } = useTranslation();
    const { user } = useUserInfo();
    const { summary } = useDashboardSummary();
    const { balances } = usePositionStats();
    const { formatAmount, eurPrice } = useCurrency();
    const { pairs } = usePairs();
    const { positions } = usePositions(1, 10);

    const navigate = useNavigate();

    // Get BTC price from pairs
    const btcPrice = pairs.find((p) => p.pair === "BTCUSDT")?.price
        ? parseFloat(pairs.find((p) => p.pair === "BTCUSDT")!.price)
        : 0;

    // Dialog states
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

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
            title: t("user.pages.dashboard.trading"),
            value: formatAmount(summary.trading.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        },
        {
            title: t("user.pages.dashboard.robots"),
            value: formatAmount(summary.robots.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <ActivityIcon className="h-5 w-5 text-purple-500" />,
        },
        {
            title: t("user.pages.dashboard.investments"),
            value: formatAmount(summary.investments.total_balance, sourceCurrency as "USD" | "EUR"),
            icon: <DollarSign className="h-5 w-5 text-orange-500" />,
        },
        {
            title: t("user.pages.dashboard.performance"),
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
                title={t("user.pages.dashboard.totalBalance")}
                value={formatAmount(summary.portfolio.total_balance, sourceCurrency as "USD" | "EUR")}
                subValue={balanceBreakdown}
                actions={
                    <>
                        <Button
                            onClick={() => setConvertDialogOpen(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                            {t("user.pages.dashboard.convert")}
                        </Button>
                        <Button
                            onClick={() => setDepositDialogOpen(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowDownToLine className="h-4 w-4" />
                            {t("user.pages.dashboard.deposit")}
                        </Button>
                        <Button
                            onClick={() => setWithdrawDialogOpen(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowUpFromLine className="h-4 w-4" />
                            {t("user.pages.dashboard.withdraw")}
                        </Button>
                    </>
                }
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

            {/* Deposits & Withdrawals Section */}
            <Card className="p-6 theme-card">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                    {t("user.pages.dashboard.depositsWithdraws")}
                </h3>
                <div className="max-h-[400px] overflow-y-auto">
                    <DepositsWithdrawsTable deposits={user?.deposits || []} withdraws={user?.withdraws || []} />
                </div>
            </Card>

            {/* Recent Activity Section */}
            <Card className="p-6 theme-card">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                    {t("user.pages.dashboard.recentPositions")}
                </h3>
                <PositionsTable positions={positions} />

                {/* add a "View all button" */}
                <div className="flex justify-center mt-4">
                    <Button onClick={() => navigate("/positions")}>{t("user.pages.dashboard.viewAll")}</Button>
                </div>
            </Card>

            {/* Dialogs */}
            <ConvertDialog
                open={convertDialogOpen}
                onOpenChange={setConvertDialogOpen}
                user={user || null}
                btcPrice={btcPrice}
                eurPrice={eurPrice}
            />

            <DepositDialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen} user={user || null} />

            <WithdrawDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen} user={user || null} />
        </div>
    );
}
