import React, { createContext, useContext, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useQueryClient } from "@tanstack/react-query";

export interface LiquidationUpdate {
    type: "positionUpdate";
    action: "liquidated" | "closed";
    position: any;
    reason: "liquidation" | "take_profit" | "stop_loss" | "cross_margin_liquidation";
}

interface LiquidationWebSocketContextType {
    isConnected: boolean;
    lastUpdate: LiquidationUpdate | null;
    readyState: ReadyState;
}

const LiquidationWebSocketContext = createContext<LiquidationWebSocketContextType | null>(null);

export const useLiquidationWebSocket = () => {
    const context = useContext(LiquidationWebSocketContext);
    if (!context) {
        throw new Error("useLiquidationWebSocket must be used within a LiquidationWebSocketProvider");
    }
    return context;
};

interface LiquidationWebSocketProviderProps {
    children: React.ReactNode;
}

export const LiquidationWebSocketProvider: React.FC<LiquidationWebSocketProviderProps> = ({ children }) => {
    const [lastUpdate, setLastUpdate] = useState<LiquidationUpdate | null>(null);
    const queryClient = useQueryClient();

    // Get WebSocket URL for liquidation server
    const socketUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        import.meta.env.VITE_LIQUIDATION_WS_HOST || import.meta.env.VITE_LIQUIDATION_WS_URL || "localhost:3334"
    }`;

    // Use the react-use-websocket hook
    const { lastJsonMessage, readyState } = useWebSocket(socketUrl, {
        share: true, // Share the WebSocket connection across components
        shouldReconnect: () => true, // Always attempt to reconnect
        reconnectAttempts: 10,
        reconnectInterval: (attemptNumber) => Math.min(Math.pow(2, attemptNumber) * 1000, 10000), // Exponential backoff
        onOpen: () => {
            console.log("✅ Connected to Liquidation Monitor WebSocket");
        },
        onClose: () => {
            console.log("🔌 Disconnected from Liquidation Monitor WebSocket");
        },
        onError: (error) => {
            console.error("❌ Liquidation WebSocket error:", error);
        },
    });

    // Process incoming messages
    useEffect(() => {
        if (lastJsonMessage) {
            try {
                const data = lastJsonMessage as any;

                // Handle welcome message
                if (data.type === "welcome") {
                    console.log("Liquidation Monitor:", data.message);
                    return;
                }

                // Handle position update messages
                if (data.type === "positionUpdate") {
                    const update = data as LiquidationUpdate;
                    setLastUpdate(update);

                    // Log the update
                    if (update.action === "liquidated") {
                        console.warn(
                            `🚨 Position liquidated: ${update.position.symbol}${update.position.base_currency} - Reason: ${update.reason}`
                        );
                    } else {
                        console.log(
                            `✅ Position closed: ${update.position.symbol}${update.position.base_currency} - Reason: ${update.reason}`
                        );
                    }

                    // Invalidate positions queries to trigger refetch
                    // This will refetch both user positions and admin positions
                    queryClient.invalidateQueries({
                        queryKey: ["positions"],
                    });
                    queryClient.invalidateQueries({
                        queryKey: ["admin-positions"],
                    });
                    // Also invalidate position stats
                    queryClient.invalidateQueries({
                        queryKey: ["position-stats"],
                    });
                }
            } catch (error) {
                console.error("Error processing liquidation message:", error);
            }
        }
    }, [lastJsonMessage, queryClient]);

    const value: LiquidationWebSocketContextType = {
        isConnected: readyState === ReadyState.OPEN,
        lastUpdate,
        readyState,
    };

    return <LiquidationWebSocketContext.Provider value={value}>{children}</LiquidationWebSocketContext.Provider>;
};
