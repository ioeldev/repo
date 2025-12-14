import React, { createContext, useEffect, useState } from "react";
import { Convert } from "easy-currencies";
import { getPriceDecimals } from "@/utils/formatPrice";

export type Currency = "USD" | "EUR";

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  eurPrice: number; // EUR price in USDT
  isLoading: boolean;
  convertAmount: (amount: number, fromCurrency?: Currency) => number;
  formatAmount: (amount: number, fromCurrency?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const stored = localStorage.getItem("preferred_currency");
    return (stored as Currency) || "EUR";
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [eurPrice, setEurPrice] = useState<number>(0.92); // EUR price in USDT
  const [isLoading, setIsLoading] = useState(false);

  // Fetch exchange rate when component mounts or currency changes
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setIsLoading(true);
        // Convert 1 USD to the target currency
        const rate = await Convert(1).from("USD").to(currency);
        setExchangeRate(rate);
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
        // Fallback rates
        setExchangeRate(currency === "EUR" ? 0.92 : 1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRate();
  }, [currency]);

  // Fetch EUR price in USDT
  useEffect(() => {
    const fetchEurPrice = async () => {
      try {
        // Fetch EUR price in USD (which is approximately USDT)
        const euroPrice = await Convert(1).from("USD").to("EUR");
        setEurPrice(euroPrice);
      } catch (error) {
        console.error("Failed to fetch EUR price:", error);
        // Keep fallback value
      }
    };

    fetchEurPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEurPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem("preferred_currency", newCurrency);
  };

  const convertAmount = (
    amount: number,
    fromCurrency: Currency = "USD",
  ): number => {
    if (fromCurrency === currency) return amount;
    if (fromCurrency === "USD" && currency === "EUR")
      return amount * exchangeRate;
    if (fromCurrency === "EUR" && currency === "USD")
      return amount / exchangeRate;
    return amount;
  };

  const formatAmount = (
    amount: number,
    fromCurrency: Currency = "USD",
  ): string => {
    const converted = convertAmount(amount, fromCurrency);
    const symbol = currency === "EUR" ? "€" : "$";
    const decimals = getPriceDecimals(converted);
    return `${symbol}${converted.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        exchangeRate,
        eurPrice,
        isLoading,
        convertAmount,
        formatAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

// Export context for use in custom hooks
export { CurrencyContext };
