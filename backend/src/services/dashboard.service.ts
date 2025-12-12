import { UsersModel } from "../models/users.model";
import { Position } from "../models/positions.model";
import { RobotsEarnings, RobotEarningModel } from "../models/robots_earnings.model";
import { InvestEarnings, InvestEarningModel } from "../models/invest_earnings.model";
import { calculatePnl, calculatePnlWithFees } from "../utils/pnl";

export interface DashboardSummary {
    wallet: {
        btc: number;
        usdt: number;
        eur: number;
        total_in_usd: number;
    };
    trading: {
        balance: number;
        open_pnl: number;
        closed_pnl: number;
        fees_paid: number;
        total_balance: number;
    };
    robots: {
        balance: number;
        earnings: number;
        total_balance: number;
    };
    investments: {
        balance: number;
        earnings: number;
        total_balance: number;
    };
    portfolio: {
        total_balance: number;
        total_performance: number;
        allocation: {
            trading: number;
            robots: number;
            investments: number;
        };
    };
}

/**
 * Get current exchange rates (BTC and USDT to EUR)
 * In production, this could fetch from an external API or cache
 */
const getExchangeRates = async (): Promise<{ btcPrice: number; usdtPrice: number }> => {
    const baseUrl = "https://api.binance.com";
    const symbolPriceTickerEndpoint = "/api/v3/ticker/price";
    const symbols = ["BTCUSDT"];
    const response = await fetch(
        `${baseUrl}${symbolPriceTickerEndpoint}?symbols=[${symbols.map((s) => `"${s}"`).join(",")}]`
    );
    const data = await response.json();

    let btcPrice = 0;
    let usdtPrice = 1; // Assume 1 USDT = 1 EUR for simplicity

    data.forEach((item: any) => {
        if (item.symbol === "BTCUSDT") {
            const priceInUsdt = parseFloat(item.price);
            btcPrice = priceInUsdt * usdtPrice; // Convert BTC to EUR via USDT
        }
    });
    return {
        btcPrice, // BTC to EUR
        usdtPrice, // USDT to EUR (roughly 1:1)
    };
};

/**
 * Calculate P&L for a single position
 */
const calculatePositionPnL = (position: any, btcPrice: number): number => {
    if (position.status === "open") {
        // For open positions, we'd need current prices
        // For now, return 0 (open P&L calculation needs real-time prices)
        return 0;
    }

    if (position.status === "closed" && position.exit_price) {
        // Use centralized PnL calculation utility
        const pnl = calculatePnlWithFees(
            {
                type: position.type as "buy" | "sell",
                entryPrice: position.entry_price,
                exitPrice: position.exit_price,
                quantity: position.quantity,
                leverage: position.leverage,
            },
            position.fees || 0
        );

        // Convert to USDT if BTC
        if (position.base_currency === "BTC") {
            return pnl * btcPrice;
        }

        return pnl;
    }

    return 0;
};

/**
 * Main function to calculate dashboard summary
 */
export const calculateDashboardSummary = async (user: UsersModel): Promise<DashboardSummary> => {
    // const { btcPrice, usdtPrice } = await getExchangeRates();
    const { btcPrice, usdtPrice } = { btcPrice: 104000, usdtPrice: 1 };

    // ===== WALLET BALANCES =====
    const btcBalance = user.balances?.find((b) => b.symbol === "BTC")?.balance || 0;
    const usdtBalance = user.balances?.find((b) => b.symbol === "USDT")?.balance || 0;
    const eurBalance = user.balances?.find((b) => b.symbol === "EUR")?.balance || 0;

    const walletTotalInUsd = btcBalance * btcPrice + usdtBalance * usdtPrice + eurBalance;

    // ===== TRADING ACCOUNT =====
    const positions = await Position.collection.find({ user_id: user._id }).toArray();

    let closedPnL = 0;
    let openPnL = 0;
    let feesPaid = 0;

    for (const position of positions) {
        const pnl = calculatePositionPnL(position, btcPrice);

        if (position.status === "closed") {
            closedPnL += pnl;
            if (position.fees) {
                feesPaid += position.fees;
            }
        } else if (position.status === "open") {
            openPnL += pnl;
        }
    }

    const tradingBalance = walletTotalInUsd;
    const tradingTotalBalance = tradingBalance + openPnL;

    // ===== ROBOTS ACCOUNT =====
    const robotsBalance = user.robots_balance || 0;
    const robotEarnings = await RobotsEarnings.collection.find({ user_id: user._id }).toArray();

    const totalRobotEarnings = robotEarnings.reduce(
        (sum: number, earning: RobotEarningModel) => sum + (earning.amount || 0),
        0
    );
    const robotsTotalBalance = robotsBalance + totalRobotEarnings;

    // ===== INVESTMENTS ACCOUNT =====
    const investBalance = user.invest_balance || 0;
    const investEarnings = await InvestEarnings.collection.find({ user_id: user._id }).toArray();

    const totalInvestEarnings = investEarnings.reduce(
        (sum: number, earning: InvestEarningModel) => sum + (earning.amount || 0),
        0
    );
    const investmentsTotalBalance = investBalance + totalInvestEarnings;

    // ===== PORTFOLIO OVERVIEW =====
    const totalBalance = walletTotalInUsd + openPnL + robotsTotalBalance + investmentsTotalBalance;
    const totalPerformance = closedPnL + openPnL + totalRobotEarnings + totalInvestEarnings;

    // Calculate allocation percentages
    const allocation = {
        trading: totalBalance > 0 ? (tradingTotalBalance / totalBalance) * 100 : 0,
        robots: totalBalance > 0 ? (robotsTotalBalance / totalBalance) * 100 : 0,
        investments: totalBalance > 0 ? (investmentsTotalBalance / totalBalance) * 100 : 0,
    };

    return {
        wallet: {
            btc: btcBalance,
            usdt: usdtBalance,
            eur: eurBalance,
            total_in_usd: parseFloat(walletTotalInUsd.toFixed(2)),
        },
        trading: {
            balance: parseFloat(tradingBalance.toFixed(2)),
            open_pnl: parseFloat(openPnL.toFixed(2)),
            closed_pnl: parseFloat(closedPnL.toFixed(2)),
            fees_paid: parseFloat(feesPaid.toFixed(2)),
            total_balance: parseFloat(tradingTotalBalance.toFixed(2)),
        },
        robots: {
            balance: parseFloat(robotsBalance.toFixed(2)),
            earnings: parseFloat(totalRobotEarnings.toFixed(2)),
            total_balance: parseFloat(robotsTotalBalance.toFixed(2)),
        },
        investments: {
            balance: parseFloat(investBalance.toFixed(2)),
            earnings: parseFloat(totalInvestEarnings.toFixed(2)),
            total_balance: parseFloat(investmentsTotalBalance.toFixed(2)),
        },
        portfolio: {
            total_balance: parseFloat(totalBalance.toFixed(2)),
            total_performance: parseFloat(totalPerformance.toFixed(2)),
            allocation,
        },
    };
};
