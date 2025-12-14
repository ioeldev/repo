import { useContext } from "react";
import {
  CurrencyContext,
  type CurrencyContextType,
} from "@/contexts/CurrencyContext";

/**
 * Hook to access currency context
 * Provides currency conversion and formatting utilities
 *
 * Returns:
 * - currency: Current selected currency ("USD" or "EUR")
 * - setCurrency: Function to change currency
 * - exchangeRate: Current exchange rate from USD to selected currency
 * - eurPrice: EUR price in USDT (fetched from exchange rates API)
 * - convertAmount: Convert an amount from one currency to another
 * - formatAmount: Format an amount with proper symbol and decimals
 * - isLoading: Whether exchange rate is being fetched
 *
 * Note: BTC price should be obtained from the usePairs() hook (BTCUSDT pair)
 *
 * Example:
 * const { formatAmount, eurPrice } = useCurrency();
 * const formatted = formatAmount(100, "USD"); // "$100.00" or "€92.00"
 */
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
