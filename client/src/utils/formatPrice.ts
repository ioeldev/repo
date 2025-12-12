/**
 * Smart price formatting utility
 * Handles both large and small prices appropriately
 */

/**
 * Get the appropriate number of decimal places for a price
 * - Large prices (>= 1000): 2 decimals
 * - Medium prices (>= 1): 2 decimals
 * - Small prices (< 1): Show significant digits (up to 8 decimals)
 */
export const getPriceDecimals = (price: number): number => {
    const absPrice = Math.abs(price);

    if (absPrice === 0) return 2;
    if (absPrice >= 1) return 2;

    // For small prices, find the first significant digit
    // e.g., 0.0000141 -> we want to show at least 3 significant digits
    const str = absPrice.toFixed(10);
    const match = str.match(/^0\.0*/);
    if (match) {
        const leadingZeros = match[0].length - 2; // subtract "0."
        // Show 2-4 significant digits after leading zeros
        return Math.min(leadingZeros + 4, 8);
    }

    return 2;
};

/**
 * Format a price with smart decimal handling
 * @param price - The price to format
 * @param options - Optional formatting options
 */
export const formatPrice = (
    price: number,
    options?: {
        showSign?: boolean; // Show + for positive numbers
        currency?: string; // Currency symbol (default: none)
        locale?: string; // Locale for number formatting (default: en-US)
    }
): string => {
    const { showSign = false, currency = "", locale = "en-US" } = options || {};

    const decimals = getPriceDecimals(price);

    let formatted = price.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    // Add sign for positive numbers if requested
    if (showSign && price > 0) {
        formatted = `+${formatted}`;
    }

    // Add currency symbol
    if (currency) {
        formatted = `${currency}${formatted}`;
    }

    return formatted;
};

/**
 * Format a price with currency symbol
 * Smart handling for both large and small values
 */
export const formatPriceWithCurrency = (price: number, currencyCode: "USD" | "EUR" = "USD"): string => {
    const symbol = currencyCode === "EUR" ? "€" : "$";
    return formatPrice(price, { currency: symbol });
};

/**
 * Format a PnL value (always shows sign)
 */
export const formatPnL = (pnl: number, currencyCode: "USD" | "EUR" = "USD"): string => {
    const symbol = currencyCode === "EUR" ? "€" : "$";
    return formatPrice(pnl, { currency: symbol, showSign: true });
};

/**
 * Format a quantity (crypto amounts)
 * Max 5 decimals for consistency
 */
export const formatQuantity = (quantity: number): string => {
    const absQuantity = Math.abs(quantity);

    if (absQuantity === 0) return "0";
    if (absQuantity >= 1000) {
        return quantity.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    if (absQuantity >= 1) {
        return quantity.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: MAX_QUANTITY_DECIMALS,
        });
    }
    // For small quantities, show up to MAX_QUANTITY_DECIMALS
    return quantity.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: MAX_QUANTITY_DECIMALS,
    });
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, showSign: boolean = true): string => {
    const formatted = value.toFixed(2);
    if (showSign && value > 0) {
        return `+${formatted}%`;
    }
    return `${formatted}%`;
};

/**
 * Maximum decimals for quantity fields
 */
export const MAX_QUANTITY_DECIMALS = 5;

/**
 * Get maximum decimals for amount based on currency
 * - USDT/EUR: 2 decimals (standard for fiat/stablecoins)
 * - BTC: 5 decimals (practical precision for crypto)
 */
export const getAmountDecimals = (currency: string): number => {
    if (currency === "BTC") return 5;
    return 2; // USDT, EUR, etc.
};

/**
 * Get slider step for amount based on currency
 */
export const getAmountStep = (currency: string): number => {
    if (currency === "BTC") return 0.00001;
    return 0.01; // USDT, EUR
};

/**
 * Clean amount input based on currency decimals
 */
export const cleanAmountInput = (value: string, currency: string): string => {
    if (!value) return "";

    // Check if it's a valid number pattern
    if (!/^\d*\.?\d*$/.test(value)) return value;

    const maxDecimals = getAmountDecimals(currency);

    // If there's a decimal point, limit decimals
    const parts = value.split(".");
    if (parts.length === 2 && parts[1].length > maxDecimals) {
        return `${parts[0]}.${parts[1].slice(0, maxDecimals)}`;
    }

    return value;
};

/**
 * Format amount for display based on currency (with locale formatting)
 */
export const formatAmountByCurrency = (amount: number, currency: string): string => {
    const decimals = getAmountDecimals(currency);
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

/**
 * Format amount as string for input fields (without locale formatting)
 * Ensures exact number of decimals based on currency
 */
export const formatAmountForInput = (amount: number, currency: string): string => {
    const decimals = getAmountDecimals(currency);
    const rounded = roundToDecimals(amount, decimals);
    return rounded.toFixed(decimals);
};

/**
 * Truncate a number to a specific number of decimal places
 * Unlike toFixed, this truncates rather than rounds
 */
export const truncateDecimals = (value: number, decimals: number): number => {
    const multiplier = Math.pow(10, decimals);
    return Math.trunc(value * multiplier) / multiplier;
};

/**
 * Round a number to a specific number of decimal places
 */
export const roundToDecimals = (value: number, decimals: number): number => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
};

/**
 * Format a quantity string for display (max 5 decimals)
 * Returns a clean string without trailing zeros beyond the decimal point
 */
export const formatQuantityInput = (value: number): string => {
    const truncated = roundToDecimals(value, MAX_QUANTITY_DECIMALS);
    // Remove unnecessary trailing zeros
    return truncated.toString();
};

/**
 * Validate and clean a quantity input string
 * Ensures max 5 decimal places
 */
export const cleanQuantityInput = (value: string): string => {
    if (!value) return "";

    // Check if it's a valid number pattern
    if (!/^\d*\.?\d*$/.test(value)) return value;

    // If there's a decimal point, limit decimals
    const parts = value.split(".");
    if (parts.length === 2 && parts[1].length > MAX_QUANTITY_DECIMALS) {
        return `${parts[0]}.${parts[1].slice(0, MAX_QUANTITY_DECIMALS)}`;
    }

    return value;
};
