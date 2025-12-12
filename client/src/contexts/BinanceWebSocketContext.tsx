import React, { createContext, useContext, useCallback, useEffect, useRef, useMemo } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

export type StreamType = "orderbook" | "ticker";

export interface BinanceMessage {
    [key: string]: any;
}

interface BinanceWebSocketContextType {
    isConnected: boolean;
    subscribe: (symbols: string[], streamType: StreamType) => void;
    unsubscribe: (symbols: string[], streamType: StreamType) => void;
    unsubscribeAll: () => void;
    addMessageHandler: (id: string, handler: (data: BinanceMessage) => void) => void;
    removeMessageHandler: (id: string) => void;
    readyState: ReadyState;
}

const BinanceWebSocketContext = createContext<BinanceWebSocketContextType | null>(null);

export const useBinanceWebSocket = () => {
    const context = useContext(BinanceWebSocketContext);
    if (!context) {
        throw new Error("useBinanceWebSocket must be used within a BinanceWebSocketProvider");
    }
    return context;
};

interface BinanceWebSocketProviderProps {
    children: React.ReactNode;
}

export const BinanceWebSocketProvider: React.FC<BinanceWebSocketProviderProps> = ({ children }) => {
    const messageHandlersRef = useRef<Map<string, (data: BinanceMessage) => void>>(new Map());
    // Use ref to store sendJsonMessage to avoid dependency changes
    const sendJsonMessageRef = useRef<(message: any) => void>(() => {});

    // Get WebSocket URL
    const socketUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        import.meta.env.VITE_WS_HOST || "localhost:3334"
    }`;

    // Use the react-use-websocket hook
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(socketUrl, {
        share: true, // Share the WebSocket connection across components
        shouldReconnect: () => true, // Always attempt to reconnect
        reconnectAttempts: 10,
        reconnectInterval: (attemptNumber) => Math.min(Math.pow(2, attemptNumber) * 1000, 10000), // Exponential backoff
        onOpen: () => {
            console.log("✅ Connected to Binance WebSocket Proxy");
        },
        onClose: () => {
            console.log("🔌 Disconnected from Binance WebSocket");
        },
        onError: (error) => {
            console.error("❌ WebSocket error:", error);
        },
    });

    // Keep sendJsonMessage ref up to date
    useEffect(() => {
        sendJsonMessageRef.current = sendJsonMessage;
    }, [sendJsonMessage]);

    // Process incoming messages
    useEffect(() => {
        if (lastJsonMessage) {
            // Broadcast to all registered handlers
            messageHandlersRef.current.forEach((handler) => {
                try {
                    handler(lastJsonMessage);
                } catch (error) {
                    console.error("Error in message handler:", error);
                }
            });
        }
    }, [lastJsonMessage]);

    // Subscribe to streams - stable function reference
    const subscribe = useCallback((symbols: string[], streamType: StreamType) => {
        if (symbols.length === 0) {
            console.warn("No symbols to subscribe to");
            return;
        }

        const message = {
            action: "subscribe",
            streamType,
            symbols,
        };

        console.log(`📡 Subscribing to ${streamType}: ${symbols.join(", ")}`);
        sendJsonMessageRef.current(message);
    }, []);

    // Unsubscribe from streams - stable function reference
    const unsubscribe = useCallback((symbols: string[], streamType: StreamType) => {
        if (symbols.length === 0) {
            console.warn("No symbols to unsubscribe from");
            return;
        }

        const message = {
            action: "unsubscribe",
            streamType,
            symbols,
        };

        console.log(`📴 Unsubscribing from ${streamType}: ${symbols.join(", ")}`);
        sendJsonMessageRef.current(message);
    }, []);

    // Unsubscribe from all streams - stable function reference
    const unsubscribeAll = useCallback(() => {
        const message = {
            action: "unsubscribeAll",
        };

        console.log("📴 Unsubscribing from all streams");
        sendJsonMessageRef.current(message);
    }, []);

    // Add a message handler - stable function reference
    const addMessageHandler = useCallback((id: string, handler: (data: BinanceMessage) => void) => {
        messageHandlersRef.current.set(id, handler);
    }, []);

    // Remove a message handler - stable function reference
    const removeMessageHandler = useCallback((id: string) => {
        messageHandlersRef.current.delete(id);
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value: BinanceWebSocketContextType = useMemo(
        () => ({
            isConnected: readyState === ReadyState.OPEN,
            subscribe,
            unsubscribe,
            unsubscribeAll,
            addMessageHandler,
            removeMessageHandler,
            readyState,
        }),
        [readyState, subscribe, unsubscribe, unsubscribeAll, addMessageHandler, removeMessageHandler]
    );

    return <BinanceWebSocketContext.Provider value={value}>{children}</BinanceWebSocketContext.Provider>;
};
