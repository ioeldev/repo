import React, { createContext, useContext, useEffect, useId, useCallback, useSyncExternalStore, useRef } from "react";
import { useBinanceWebSocket } from "./BinanceWebSocketContext";

export interface TickerData {
    symbol: string;
    price: number;
    openPrice: number;
    high: number;
    low: number;
    volume: number;
    quoteVolume: number;
    priceChange: number;
    priceChangePercent: number;
}

// Store for individual ticker subscriptions
class TickerStore {
    private tickers: Map<string, TickerData> = new Map();
    private listeners: Set<() => void> = new Set();
    private symbolListeners: Map<string, Set<() => void>> = new Map();

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    subscribeToSymbol = (symbol: string, listener: () => void): (() => void) => {
        if (!this.symbolListeners.has(symbol)) {
            this.symbolListeners.set(symbol, new Set());
        }
        this.symbolListeners.get(symbol)!.add(listener);

        return () => {
            const symbolListeners = this.symbolListeners.get(symbol);
            if (symbolListeners) {
                symbolListeners.delete(listener);
                if (symbolListeners.size === 0) {
                    this.symbolListeners.delete(symbol);
                }
            }
        };
    };

    getSnapshot = (): Map<string, TickerData> => {
        return this.tickers;
    };

    getSymbolSnapshot = (symbol: string): TickerData | undefined => {
        return this.tickers.get(symbol);
    };

    updateTicker = (symbol: string, data: TickerData) => {
        this.tickers.set(symbol, data);

        // Notify symbol-specific listeners
        const symbolListeners = this.symbolListeners.get(symbol);
        if (symbolListeners) {
            symbolListeners.forEach((listener) => listener());
        }

        // Notify global listeners (for components that need all tickers)
        this.listeners.forEach((listener) => listener());
    };

    clear = () => {
        this.tickers.clear();
        this.listeners.forEach((listener) => listener());
        this.symbolListeners.forEach((listeners) => {
            listeners.forEach((listener) => listener());
        });
    };
}

interface TickerContextType {
    getTicker: (symbol: string) => TickerData | undefined;
    getAllTickers: () => Map<string, TickerData>;
}

const tickerStore = new TickerStore();
const TickerContext = createContext<TickerContextType | null>(null);

export const useTickers = () => {
    const context = useContext(TickerContext);
    if (!context) {
        throw new Error("useTickers must be used within a TickerProvider");
    }
    return context;
};

// Hook to subscribe to a specific ticker with minimal re-renders
export const useTickerSymbol = (symbol: string): TickerData | undefined => {
    const getSnapshot = useCallback(() => tickerStore.getSymbolSnapshot(symbol), [symbol]);
    const subscribe = useCallback(
        (onStoreChange: () => void) => tickerStore.subscribeToSymbol(symbol, onStoreChange),
        [symbol]
    );

    return useSyncExternalStore(subscribe, getSnapshot);
};

// Hook to get all tickers (use sparingly)
export const useAllTickers = (): Map<string, TickerData> => {
    return useSyncExternalStore(tickerStore.subscribe, tickerStore.getSnapshot, tickerStore.getSnapshot);
};

interface TickerProviderProps {
    children: React.ReactNode;
}

export const TickerProvider: React.FC<TickerProviderProps> = ({ children }) => {
    const componentId = useId();
    const { subscribe, unsubscribe, addMessageHandler, removeMessageHandler, isConnected } = useBinanceWebSocket();
    const isSubscribedRef = useRef(false);

    // Handle incoming ticker messages - defined outside useEffect to avoid recreation
    const handleMessage = useCallback((data: any) => {
        // Handle array of 24hrMiniTicker events (all market mini tickers stream)
        if (Array.isArray(data)) {
            data.forEach((ticker: any) => {
                if (ticker.e === "24hrMiniTicker") {
                    const closePrice = parseFloat(ticker.c);
                    const openPrice = parseFloat(ticker.o);
                    // Calculate price change and percent (mini ticker doesn't include these fields)
                    const priceChange = closePrice - openPrice;
                    const priceChangePercent = openPrice > 0 ? (priceChange / openPrice) * 100 : 0;

                    const tickerData: TickerData = {
                        symbol: ticker.s,
                        price: closePrice,
                        openPrice: openPrice,
                        high: parseFloat(ticker.h),
                        low: parseFloat(ticker.l),
                        volume: parseFloat(ticker.v),
                        quoteVolume: parseFloat(ticker.q),
                        priceChange: priceChange,
                        priceChangePercent: priceChangePercent,
                    };

                    // Update store directly without causing context re-render
                    tickerStore.updateTicker(ticker.s, tickerData);
                }
            });
        }
        // Also handle individual ticker updates (24hrMiniTicker)
        else if (data.e === "24hrMiniTicker") {
            const closePrice = parseFloat(data.c);
            const openPrice = parseFloat(data.o);
            const priceChange = closePrice - openPrice;
            const priceChangePercent = openPrice > 0 ? (priceChange / openPrice) * 100 : 0;

            const tickerData: TickerData = {
                symbol: data.s,
                price: closePrice,
                openPrice: openPrice,
                high: parseFloat(data.h),
                low: parseFloat(data.l),
                volume: parseFloat(data.v),
                quoteVolume: parseFloat(data.q),
                priceChange: priceChange,
                priceChangePercent: priceChangePercent,
            };

            // Update store directly without causing context re-render
            tickerStore.updateTicker(data.s, tickerData);
        }
    }, []);

    // Register message handler - runs once on mount
    useEffect(() => {
        addMessageHandler(componentId, handleMessage);
        return () => {
            removeMessageHandler(componentId);
        };
    }, [componentId, handleMessage, addMessageHandler, removeMessageHandler]);

    // Subscribe to tickers - wait for WebSocket connection
    useEffect(() => {
        // Wait for WebSocket to be connected
        if (!isConnected) {
            return;
        }

        // Prevent duplicate subscriptions
        if (isSubscribedRef.current) {
            return;
        }

        const ALL_TICKERS_STREAM = "!miniTicker@arr";

        console.log("📡 Subscribing to all market mini tickers stream");
        subscribe([ALL_TICKERS_STREAM], "ticker");
        isSubscribedRef.current = true;

        return () => {
            if (isSubscribedRef.current) {
                console.log("📴 Unsubscribing from all market mini tickers stream");
                unsubscribe([ALL_TICKERS_STREAM], "ticker");
                isSubscribedRef.current = false;
                tickerStore.clear();
            }
        };
    }, [isConnected, subscribe, unsubscribe]); // Subscribe when connected

    // Helper function to get ticker for a specific symbol (stable reference)
    const getTicker = useCallback((symbol: string): TickerData | undefined => {
        return tickerStore.getSymbolSnapshot(symbol);
    }, []);

    // Helper to get all tickers (stable reference)
    const getAllTickers = useCallback((): Map<string, TickerData> => {
        return tickerStore.getSnapshot();
    }, []);

    const value: TickerContextType = {
        getTicker,
        getAllTickers,
    };

    return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
};
