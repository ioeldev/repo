/**
 * Calculate isolated liquidation price
 * Simple formula with 0.95 factor to account for fees
 * This matches the backend calculation exactly
 */
export function calculateIsolatedLiquidationPrice(entryPrice: number, leverage: number, type: "buy" | "sell"): number {
    if (leverage <= 1) {
        // No liquidation for 1x leverage
        return type === "buy" ? 0 : Number.MAX_SAFE_INTEGER;
    }

    if (type === "buy") {
        // Long position: liquidation when price drops
        return entryPrice * (1 - 0.95 / leverage);
    } else {
        // Short position: liquidation when price rises
        return entryPrice * (1 + 0.95 / leverage);
    }
}
