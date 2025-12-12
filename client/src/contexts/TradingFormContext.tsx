import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePositionStats } from "@/hooks/usePositionStats";
import { useTradingContext } from "./TradingContext";
import { useTickers } from "./TickerContext";
import { calculateIsolatedLiquidationPrice } from "@/utils/liquidation";

export type PositionType = "long" | "short";
export type OrderType = "market" | "limit";

export interface TradingFormState {
    // Trading parameters
    leverage: number;
    positionType: PositionType;
    orderType: OrderType;
    orderValue: number;

    // Price and amount (for limit orders)
    limitPrice?: number;
    amount?: number;

    // Risk management
    takeProfit?: number;
    stopLoss?: number;

    // UI state
    leverageDialogOpen: boolean;
}

export interface TradingFormContextType {
    // State
    state: TradingFormState;

    // Actions
    setLeverage: (leverage: number) => void;
    setPositionType: (positionType: PositionType) => void;
    setOrderType: (orderType: OrderType) => void;
    setOrderValue: (orderValue: number) => void;
    setLimitPrice: (price: number | undefined) => void;
    setAmount: (amount: number | undefined) => void;
    setTakeProfit: (price: number | undefined) => void;
    setStopLoss: (price: number | undefined) => void;
    setLeverageDialogOpen: (open: boolean) => void;

    // Computed values
    availableBalance: number; // Available balance for trading in USD
    maxOrderValue: number; // Maximum order value based on leverage and balance
    marginRequired: number; // Margin required for current order
    liquidationPrice: number | null; // Estimated liquidation price
    positionSize: number; // Final position size (margin × leverage ÷ price)
    currentPrice: number; // Current price of selected pair
    createPositionPayload: any; // Ready-to-send payload for creating a position

    // Balance info
    balances: {
        btc: number;
        usdt: number;
        eur: number;
    };

    // Loading states
    isLoading: boolean;
}

const TradingFormContext = createContext<TradingFormContextType | undefined>(undefined);

// Default leverage value
const DEFAULT_LEVERAGE = 20;

// localStorage key for persistence
const LEVERAGE_STORAGE_KEY = "trading_leverage";

export const TradingFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { balances, isLoading } = usePositionStats();
    const { selectedPair } = useTradingContext();

    // Initialize state with persisted values
    const [state, setState] = useState<TradingFormState>({
        leverage: DEFAULT_LEVERAGE,
        positionType: "long",
        orderType: "market",
        orderValue: 0,
        takeProfit: undefined,
        stopLoss: undefined,
        leverageDialogOpen: false,
    });

    // Load persisted leverage on mount
    useEffect(() => {
        const savedLeverage = localStorage.getItem(LEVERAGE_STORAGE_KEY);
        if (savedLeverage) {
            const leverage = parseInt(savedLeverage, 10);
            if (leverage >= 1 && leverage <= 100) {
                setState((prev) => ({ ...prev, leverage }));
            }
        }
    }, []);

    // Persist leverage changes
    const setLeverage = useCallback((leverage: number) => {
        setState((prev) => ({ ...prev, leverage }));
        localStorage.setItem(LEVERAGE_STORAGE_KEY, leverage.toString());
    }, []);

    const setPositionType = useCallback((positionType: PositionType) => {
        setState((prev) => ({ ...prev, positionType }));
    }, []);

    const setOrderType = useCallback((orderType: OrderType) => {
        setState((prev) => ({ ...prev, orderType }));
    }, []);

    const setOrderValue = useCallback((orderValue: number) => {
        setState((prev) => ({ ...prev, orderValue }));
    }, []);

    const setLimitPrice = useCallback((limitPrice: number | undefined) => {
        setState((prev) => ({ ...prev, limitPrice }));
    }, []);

    const setAmount = useCallback((amount: number | undefined) => {
        setState((prev) => ({ ...prev, amount }));
    }, []);

    const setTakeProfit = useCallback((takeProfit: number | undefined) => {
        setState((prev) => ({ ...prev, takeProfit }));
    }, []);

    const setStopLoss = useCallback((stopLoss: number | undefined) => {
        setState((prev) => ({ ...prev, stopLoss }));
    }, []);

    const setLeverageDialogOpen = useCallback((leverageDialogOpen: boolean) => {
        setState((prev) => ({ ...prev, leverageDialogOpen }));
    }, []);

    // Calculate available balance in USD (simplified - assuming USDT as base)
    const availableBalance = balances.usdt;

    // Calculate maximum order value based on leverage and available balance
    const maxOrderValue = availableBalance * state.leverage;

    // Calculate margin required for current order
    const marginRequired = state.orderValue / state.leverage;

    // Get real-time ticker data
    const { getTicker } = useTickers();
    const tickerData = selectedPair ? getTicker(selectedPair.pair) : null;

    // Calculate quantity based on selected pair and current price
    const currentPrice = tickerData?.price || (selectedPair ? parseFloat(selectedPair.price) : 0);
    // Position size = margin required × leverage ÷ current price
    const positionSize = currentPrice > 0 ? (marginRequired * state.leverage) / currentPrice : 0;

    // Calculate estimated liquidation price using isolated margin formula
    const liquidationPrice =
        state.orderValue > 0 && state.leverage > 1 && currentPrice > 0
            ? calculateIsolatedLiquidationPrice(
                  currentPrice,
                  state.leverage,
                  state.positionType === "long" ? "buy" : "sell"
              )
            : null;

    // Prepare position creation payload
    const createPositionPayload =
        selectedPair && currentPrice > 0 && state.orderValue > 0
            ? (() => {
                  const baseCurrencyMatch = selectedPair.pair.match(/USDT$|BTC$|EUR$/);
                  if (!baseCurrencyMatch) return null;

                  return {
                      symbol: selectedPair.pair.replace(/USDT$|BTC$|EUR$/, ""), // Extract base symbol (e.g., "BTC" from "BTCUSDT")
                      manual_symbol: selectedPair.pair.replace(/USDT$|BTC$|EUR$/, ""), // Same as symbol for now
                      quantity: positionSize, // Position size (margin × leverage ÷ price) - stored in DB
                      entry_price: currentPrice,
                      base_currency: baseCurrencyMatch[0], // Extract quote currency (e.g., "USDT" from "BTCUSDT")
                      base_currency_amount: marginRequired,
                      type: state.positionType === "long" ? "buy" : "sell",
                      leverage: state.leverage,
                      position_size: positionSize, // Same as quantity for consistency
                      take_profit: state.takeProfit,
                      stop_loss: state.stopLoss,
                  };
              })()
            : null;

    const value: TradingFormContextType = {
        state,
        setLeverage,
        setPositionType,
        setOrderType,
        setOrderValue,
        setLimitPrice,
        setAmount,
        setTakeProfit,
        setStopLoss,
        setLeverageDialogOpen,
        availableBalance,
        maxOrderValue,
        marginRequired,
        liquidationPrice,
        positionSize,
        currentPrice,
        createPositionPayload,
        balances,
        isLoading,
    };

    return <TradingFormContext.Provider value={value}>{children}</TradingFormContext.Provider>;
};

// Custom hook to use trading form context
export const useTradingForm = () => {
    const context = useContext(TradingFormContext);
    if (context === undefined) {
        throw new Error("useTradingForm must be used within a TradingFormProvider");
    }
    return context;
};

// Export context for advanced use cases
export { TradingFormContext };
