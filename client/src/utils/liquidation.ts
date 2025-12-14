// Maintenance Margin Rate (default 0.5%)
const MAINTENANCE_MARGIN_RATE = 0.005;

/**
 * Calculate isolated liquidation price using precise formula
 * Based on: LP = Entry Price ± [(Initial Margin - Maintenance Margin) / Quantity] ± (Extra Margin / Quantity)
 */
export function calculateIsolatedLiquidationPrice(
  entryPrice: number,
  leverage: number,
  type: "buy" | "sell",
  marginAllocated: number,
  extraMarginAdded: number = 0,
): number {
  if (leverage <= 1) {
    return type === "buy" ? 0 : Number.MAX_SAFE_INTEGER;
  }

  // Position Value = Margin × Leverage
  const positionValue = marginAllocated * leverage;

  // Quantity in crypto (e.g., BTC)
  const quantity = positionValue / entryPrice;

  // Initial Margin (what you allocated)
  const initialMargin = marginAllocated;

  // Maintenance Margin (minimum cushion required)
  const maintenanceMargin = positionValue * MAINTENANCE_MARGIN_RATE;

  // Calculate liquidation price
  const marginDifference = (initialMargin - maintenanceMargin) / quantity;
  const extraMarginEffect = extraMarginAdded / quantity;

  if (type === "buy") {
    // Long: LP = Entry Price - (Initial Margin - Maintenance Margin) / Quantity - Extra Margin / Quantity
    return entryPrice - marginDifference - extraMarginEffect;
  } else {
    // Short: LP = Entry Price + (Initial Margin - Maintenance Margin) / Quantity + Extra Margin / Quantity
    return entryPrice + marginDifference + extraMarginEffect;
  }
}
