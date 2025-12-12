import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";

export type Pair = {
    name: string;
    pair: string;
    price: string;
    change: string;
    volume: string;
};

export interface TradingContextType {
    selectedPair: Pair | null;
    setSelectedPair: (pair: Pair) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode; pairs: Pair[] }> = ({ children, pairs }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedPair, setSelectedPairState] = useState<Pair | null>(null);

    // Track the current symbol to prevent redundant updates
    const currentSymbolRef = useRef<string | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize selected pair from URL or default to first pair
    useEffect(() => {
        // Only run initialization once
        if (isInitializedRef.current || pairs.length === 0) {
            return;
        }

        const symbolFromUrl = searchParams.get("symbol");

        if (symbolFromUrl) {
            // Find pair matching URL symbol
            const foundPair = pairs.find((p) => p.pair === symbolFromUrl);
            if (foundPair) {
                currentSymbolRef.current = foundPair.pair;
                setSelectedPairState(foundPair);
                isInitializedRef.current = true;
                return;
            }
        }

        // Default to first pair if no valid symbol in URL
        currentSymbolRef.current = pairs[0].pair;
        setSelectedPairState(pairs[0]);
        isInitializedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pairs]); // Only depend on pairs - runs once when pairs load

    // Handle URL changes (browser back/forward navigation)
    useEffect(() => {
        if (!isInitializedRef.current || pairs.length === 0) {
            return;
        }

        const symbolFromUrl = searchParams.get("symbol");

        // Only update if URL symbol is different from current
        if (symbolFromUrl && symbolFromUrl !== currentSymbolRef.current) {
            const foundPair = pairs.find((p) => p.pair === symbolFromUrl);
            if (foundPair) {
                currentSymbolRef.current = foundPair.pair;
                setSelectedPairState(foundPair);
            }
        }
    }, [searchParams, pairs]);

    const handleSetSelectedPair = useCallback(
        (pair: Pair) => {
            // Skip if selecting the same pair
            if (currentSymbolRef.current === pair.pair) {
                return;
            }

            currentSymbolRef.current = pair.pair;
            setSelectedPairState(pair);
            // Update URL to reflect the selected symbol
            setSearchParams({ symbol: pair.pair });
        },
        [setSearchParams]
    );

    return (
        <TradingContext.Provider
            value={{
                selectedPair,
                setSelectedPair: handleSetSelectedPair,
            }}
        >
            {children}
        </TradingContext.Provider>
    );
};

// Custom hook to use trading context
export const useTradingContext = () => {
    const context = useContext(TradingContext);
    if (context === undefined) {
        throw new Error("useTradingContext must be used within a TradingProvider");
    }
    return context;
};

// Export context for advanced use cases
export { TradingContext };
