import { useMemo } from "react";
import { useTickerSymbol } from "@/contexts/TickerContext";
import { calculateUnrealizedPnl } from "@/utils/pnl";
import type { Position } from "@/services/api";

// Component to calculate PnL for a single position
const usePositionWithPnL = (position: Position) => {
    // Construct the symbol (e.g., "BTC" + "USDT" = "BTCUSDT")
    const symbol = `${position.symbol}${position.base_currency}`;
    const ticker = useTickerSymbol(symbol);

    // Use real-time price if available, otherwise use entry price
    const currentPrice = ticker?.price || position.entry_price;

    // Calculate unrealized PnL for open positions
    if (position.status === "open") {
        const unrealizedPnl = calculateUnrealizedPnl(
            position.type,
            position.entry_price,
            currentPrice,
            position.quantity
        );

        return {
            ...position,
            currentPrice,
            unrealizedPnl,
        };
    }

    // For closed positions, just return as-is
    return {
        ...position,
        currentPrice,
    };
};

export const usePositionPnL = (positions: Position[]) => {
    // For performance, we'll return a stable array reference when positions haven't changed
    // and only update when positions change or relevant tickers update
    return useMemo(() => {
        // Map each position to include PnL calculations
        // This will only re-render when the positions array changes
        return positions.map((position) => {
            // Each position will independently subscribe to its ticker
            // This is handled inside the component that renders each position

            // Construct the symbol (e.g., "BTC" + "USDT" = "BTCUSDT")
            const symbol = `${position.symbol}${position.base_currency}`;

            // For now, return position with symbol for child components to use
            return {
                ...position,
                tickerSymbol: symbol,
            };
        });
    }, [positions]);
};

// Export the hook for individual position PnL calculation
export { usePositionWithPnL };
