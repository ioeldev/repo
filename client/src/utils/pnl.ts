/**
 * Centralized PnL calculation utilities for the frontend
 *
 * IMPORTANT: The quantity stored in the database is already the leveraged position size.
 * Frontend sends: quantity = (margin * leverage) / entryPrice
 * Therefore, we should NOT multiply by leverage again when calculating PnL.
 */

export interface PnLCalculationParams {
    type: "buy" | "sell";
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    leverage?: number; // Kept for backwards compatibility but not used in calculation
}

/**
 * Calculate Profit and Loss (PnL) for a position
 *
 * @param params - PnL calculation parameters
 * @returns The calculated PnL value
 *
 * @example
 * const pnl = calculatePnl({
 *   type: "buy",
 *   entryPrice: 50000,
 *   exitPrice: 55000,
 *   quantity: 0.02, // Already leveraged position size
 *   leverage: 10 // Not used in calculation
 * });
 */
export const calculatePnl = (params: PnLCalculationParams): number => {
    const { type, entryPrice, exitPrice, quantity } = params;

    // IMPORTANT: quantity is already the leveraged position size from frontend
    // Frontend sends: quantity = (margin * leverage) / entryPrice
    // So we should NOT multiply by leverage again
    const priceDifference = exitPrice - entryPrice;

    return type === "buy" ? priceDifference * quantity : -priceDifference * quantity;
};

/**
 * Calculate PnL with fees applied
 *
 * @param params - PnL calculation parameters
 * @param fees - Fees to subtract from positive PnL
 * @returns The net PnL after fees
 */
export const calculatePnlWithFees = (params: PnLCalculationParams, fees: number = 0): number => {
    const pnl = calculatePnl(params);

    // Only subtract fees from positive PnL
    return pnl > 0 ? pnl - fees : pnl;
};

/**
 * Calculate unrealized PnL for an open position
 *
 * @param type - Position type ("buy" or "sell")
 * @param entryPrice - Entry price of the position
 * @param currentPrice - Current market price
 * @param quantity - Position quantity (already leveraged)
 * @returns The unrealized PnL value
 */
export const calculateUnrealizedPnl = (
    type: "buy" | "sell",
    entryPrice: number,
    currentPrice: number,
    quantity: number
): number => {
    return calculatePnl({
        type,
        entryPrice,
        exitPrice: currentPrice,
        quantity,
    });
};
