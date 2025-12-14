import WebSocket from "ws";

// Use /stream endpoint to get combined stream format with stream name in each message
const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream";

// Binance limits: 5 incoming messages per second, 300 connections per 5 min, 1024 streams max
const MESSAGE_RATE_LIMIT_MS = 250; // 4 messages per second (leaving headroom)
const MAX_STREAMS_PER_MESSAGE = 200; // Batch streams in chunks
const RECONNECT_DELAY_MS = 5000;
const CONNECTION_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours (reconnect before 24h limit)

interface ClientSubscriptions {
    [key: string]: boolean;
}

interface SubscriptionMessage {
    method: "SUBSCRIBE" | "UNSUBSCRIBE" | "LIST_SUBSCRIPTIONS";
    params?: string[];
    id: number;
}

type StreamType = "orderbook" | "ticker";

interface SubscriptionRequest {
    action: "subscribe" | "unsubscribe" | "unsubscribeAll" | "listSubscriptions";
    symbols?: string[];
    streamType?: StreamType; // Default: "orderbook"
}

// Store active client subscriptions
const clientSubscriptions = new Map<WebSocket, ClientSubscriptions>();
// Store all connected clients
const connectedClients = new Set<WebSocket>();
// Binance WebSocket connection
let binanceWs: WebSocket | null = null;
// Track all active subscriptions globally
const globalSubscriptions = new Map<string, number>();
let messageId = 1;

// Rate limiting queue for messages to Binance
let messageQueue: Array<{ message: SubscriptionMessage; resolve?: () => void }> = [];
let isProcessingQueue = false;

// Connection age tracking for 24-hour limit
let connectionAgeTimeout: NodeJS.Timeout | null = null;

// Helper function to generate stream name based on type
const getStreamName = (symbol: string, streamType: StreamType): string => {
    // Handle special all market mini tickers stream
    if (symbol === "!miniTicker@arr") {
        return symbol; // Return as-is for the all market mini tickers stream
    }

    const lowerSymbol = symbol.toLowerCase();
    if (streamType === "ticker") {
        return `${lowerSymbol}@miniTicker`; // Individual 24hr mini ticker
    }
    return `${lowerSymbol}@depth10@1000ms`; // Partial book depth - top 10 levels every 1000ms
};

/**
 * Rate-limited send to Binance WebSocket
 * Ensures we don't exceed 5 messages per second limit
 */
const sendToBinance = (message: SubscriptionMessage): Promise<void> => {
    return new Promise((resolve) => {
        messageQueue.push({ message, resolve });

        if (!isProcessingQueue) {
            processMessageQueue();
        }
    });
};

/**
 * Process the message queue with rate limiting
 */
const processMessageQueue = (): void => {
    if (messageQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    isProcessingQueue = true;
    const item = messageQueue.shift();

    if (item && binanceWs && binanceWs.readyState === WebSocket.OPEN) {
        try {
            binanceWs.send(JSON.stringify(item.message));
            console.log(`📤 Sent to Binance: ${item.message.method} - ${item.message.params.length} stream(s)`);
        } catch (error) {
            console.error("Error sending message to Binance:", error);
        }
        item.resolve?.();
    }

    // Process next message after rate limit delay
    setTimeout(processMessageQueue, MESSAGE_RATE_LIMIT_MS);
};

/**
 * Restore all subscriptions after reconnecting to Binance
 */
const restoreSubscriptions = async (): Promise<void> => {
    if (!binanceWs || binanceWs.readyState !== WebSocket.OPEN) return;

    const streams = Array.from(globalSubscriptions.keys());
    if (streams.length === 0) {
        console.log("📊 No subscriptions to restore");
        return;
    }

    console.log(`🔄 Restoring ${streams.length} subscription(s)...`);

    // Batch into chunks to avoid overwhelming the connection
    for (let i = 0; i < streams.length; i += MAX_STREAMS_PER_MESSAGE) {
        const chunk = streams.slice(i, i + MAX_STREAMS_PER_MESSAGE);
        const subscribeMessage: SubscriptionMessage = {
            method: "SUBSCRIBE",
            params: chunk,
            id: messageId++,
        };

        await sendToBinance(subscribeMessage);
    }

    console.log(`✅ Restored ${streams.length} subscription(s)`);
};

/**
 * Notify all connected clients about connection status changes
 */
const notifyClientsConnectionStatus = (status: "connected" | "disconnected" | "reconnecting"): void => {
    const statusMessage = JSON.stringify({
        type: "connection_status",
        status,
        message:
            status === "connected"
                ? "Connected to Binance WebSocket"
                : status === "disconnected"
                ? "Connection to Binance lost, attempting to reconnect..."
                : "Reconnecting to Binance...",
        timestamp: Date.now(),
    });

    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(statusMessage);
            } catch (error) {
                console.error("Error sending status to client:", error);
            }
        }
    });
};

/**
 * Schedule a reconnection before the 24-hour connection limit
 */
const scheduleConnectionRefresh = (): void => {
    // Clear any existing timeout
    if (connectionAgeTimeout) {
        clearTimeout(connectionAgeTimeout);
        connectionAgeTimeout = null;
    }

    // Schedule reconnection before 24-hour limit
    connectionAgeTimeout = setTimeout(() => {
        console.log("⏰ Connection approaching 24-hour limit, initiating proactive reconnect...");
        if (binanceWs) {
            binanceWs.close(1000, "Scheduled reconnection before 24h limit");
        }
    }, CONNECTION_MAX_AGE_MS);

    console.log(`⏰ Scheduled connection refresh in ${CONNECTION_MAX_AGE_MS / 1000 / 60 / 60} hours`);
};

/**
 * Initialize connection to Binance WebSocket
 */
const connectToBinance = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            // Clear message queue on new connection
            messageQueue = [];
            isProcessingQueue = false;

            binanceWs = new WebSocket(BINANCE_WS_URL);

            binanceWs.on("open", async () => {
                console.log("✅ Connected to Binance WebSocket");

                // Schedule proactive reconnection before 24h limit
                scheduleConnectionRefresh();

                // Restore existing subscriptions after reconnect
                await restoreSubscriptions();

                // Notify clients
                notifyClientsConnectionStatus("connected");

                resolve();
            });

            binanceWs.on("message", (data: WebSocket.Data) => {
                const message = data.toString();

                try {
                    const parsed = JSON.parse(message);

                    // Handle Binance response messages (subscribe/unsubscribe confirmations)
                    if (parsed.id !== undefined || parsed.result !== undefined) {
                        // This is a response to a request, not stream data
                        // Only forward to clients that need it (handled by specific handlers)
                        return;
                    }

                    // Combined stream format: {"stream":"btcusdt@depth10@1000ms","data":{...}}
                    if (parsed.stream && parsed.data) {
                        const stream = parsed.stream;
                        // Send only the data part to clients, with stream info
                        const clientMessage = JSON.stringify(parsed.data);

                        connectedClients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                const clientSubs = clientSubscriptions.get(client) || {};
                                if (clientSubs[stream]) {
                                    client.send(clientMessage);
                                }
                            }
                        });
                    }
                } catch {
                    // If parsing fails, ignore
                    console.error("Failed to parse Binance message");
                }
            });

            binanceWs.on("error", (error) => {
                console.error("❌ Binance WebSocket error:", error);
                reject(error);
            });

            binanceWs.on("close", (code, reason) => {
                const reasonStr = reason?.toString() || "none";
                console.log(`🔌 Disconnected from Binance WebSocket. Code: ${code}, Reason: ${reasonStr}`);

                // Log common close codes for debugging
                const closeCodeDescriptions: Record<number, string> = {
                    1000: "Normal closure",
                    1001: "Going away",
                    1002: "Protocol error",
                    1003: "Unsupported data",
                    1006: "Abnormal closure (no close frame)",
                    1007: "Invalid frame payload data",
                    1008: "Policy violation",
                    1009: "Message too big",
                    1010: "Mandatory extension",
                    1011: "Internal server error",
                    1012: "Service restart",
                    1013: "Try again later",
                    1015: "TLS handshake failure",
                };

                if (closeCodeDescriptions[code]) {
                    console.log(`📋 Close code meaning: ${closeCodeDescriptions[code]}`);
                }

                binanceWs = null;

                // Clear connection age timeout
                if (connectionAgeTimeout) {
                    clearTimeout(connectionAgeTimeout);
                    connectionAgeTimeout = null;
                }

                // Notify clients about disconnection
                notifyClientsConnectionStatus("disconnected");

                // Attempt to reconnect after delay
                setTimeout(() => {
                    console.log("🔄 Attempting to reconnect to Binance...");
                    notifyClientsConnectionStatus("reconnecting");
                    connectToBinance().catch((err) => console.error("Reconnection failed:", err));
                }, RECONNECT_DELAY_MS);
            });

            // Handle ping frames - ws library auto-responds with pong
            binanceWs.on("ping", () => {
                console.log("🏓 [BINANCE] Ping");
            });
        } catch (error) {
            reject(error);
        }
    });
};

export const initWebSocket = async (wss: WebSocket.Server) => {
    // Connect to Binance on startup
    await connectToBinance();

    wss.on("connection", (ws: WebSocket) => {
        console.log("👤 New client connected");

        // Track this client
        connectedClients.add(ws);
        clientSubscriptions.set(ws, {});

        ws.on("message", (message: string) => {
            try {
                const data: SubscriptionRequest = JSON.parse(message);
                console.log(`📨 Received message: ${JSON.stringify(data)}`);

                const streamType: StreamType = data.streamType || "orderbook";

                if (data.action === "subscribe") {
                    handleSubscription(ws, data.symbols || [], streamType);
                } else if (data.action === "unsubscribe") {
                    handleUnsubscription(ws, data.symbols || [], streamType);
                } else if (data.action === "unsubscribeAll") {
                    handleUnsubscribeAll(ws);
                } else if (data.action === "listSubscriptions") {
                    handleListSubscriptions(ws);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                ws.send(JSON.stringify({ error: "Invalid message format" }));
            }
        });

        ws.on("close", () => {
            console.log("👤 Client disconnected");
            // Remove this client and cleanup subscriptions
            const clientSubs = clientSubscriptions.get(ws) || {};
            const streamsToUnsubscribe: string[] = [];

            // Decrement global subscription counts for this client's subscriptions
            Object.keys(clientSubs).forEach((stream) => {
                const count = (globalSubscriptions.get(stream) || 1) - 1;
                if (count <= 0) {
                    globalSubscriptions.delete(stream);
                    streamsToUnsubscribe.push(stream); // Collect before deleting
                } else {
                    globalSubscriptions.set(stream, count);
                }
            });

            connectedClients.delete(ws);
            clientSubscriptions.delete(ws);

            // Unsubscribe from streams no other client is using
            if (streamsToUnsubscribe.length > 0 && binanceWs && binanceWs.readyState === WebSocket.OPEN) {
                const unsubscribeMessage: SubscriptionMessage = {
                    method: "UNSUBSCRIBE",
                    params: streamsToUnsubscribe,
                    id: messageId++,
                };

                console.log(`🧹 Client disconnect cleanup: ${streamsToUnsubscribe.join(", ")}`);
                sendToBinance(unsubscribeMessage);
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });

        // Send welcome message with current connection status
        const isConnected = binanceWs && binanceWs.readyState === WebSocket.OPEN;
        ws.send(
            JSON.stringify({
                type: "welcome",
                message: "Welcome to Binance WebSocket Proxy!",
                info: "Send {action: 'subscribe', symbols: ['BTCUSDT', 'ETHUSDT'], streamType: 'orderbook'|'ticker'} to subscribe",
                binanceConnected: isConnected,
            })
        );
    });
};

// Subscribe to orderbook/ticker streams
const handleSubscription = (ws: WebSocket, symbols: string[], streamType: StreamType = "orderbook") => {
    const subscriptions = clientSubscriptions.get(ws) || {};
    const streamsToSubscribe: string[] = [];

    symbols.forEach((symbol: string) => {
        const stream = getStreamName(symbol, streamType);

        if (!subscriptions[stream]) {
            subscriptions[stream] = true;

            // Check if we're already subscribed globally (another client may have subscribed)
            if (!globalSubscriptions.has(stream)) {
                globalSubscriptions.set(stream, 0);
                streamsToSubscribe.push(stream);
            }
            // Increment subscription count
            globalSubscriptions.set(stream, (globalSubscriptions.get(stream) || 0) + 1);
        }
    });

    if (streamsToSubscribe.length > 0 && binanceWs && binanceWs.readyState === WebSocket.OPEN) {
        const subscribeMessage: SubscriptionMessage = {
            method: "SUBSCRIBE",
            params: streamsToSubscribe,
            id: messageId++,
        };

        console.log(`📥 Subscribing to ${streamType}: ${streamsToSubscribe.join(", ")}`);
        sendToBinance(subscribeMessage); // Use rate-limited send
    }

    clientSubscriptions.set(ws, subscriptions);
    ws.send(
        JSON.stringify({
            success: true,
            message: `Subscribed to: ${Object.keys(subscriptions).join(", ")}`,
        })
    );
};

// Unsubscribe from orderbook/ticker streams
const handleUnsubscription = (ws: WebSocket, symbols: string[], streamType: StreamType = "orderbook") => {
    const subscriptions = clientSubscriptions.get(ws) || {};
    const streamsToUnsubscribe: string[] = [];

    symbols.forEach((symbol: string) => {
        const stream = getStreamName(symbol, streamType);

        if (subscriptions[stream]) {
            delete subscriptions[stream];

            // Decrement subscription count
            const count = (globalSubscriptions.get(stream) || 1) - 1;
            if (count <= 0) {
                globalSubscriptions.delete(stream);
                streamsToUnsubscribe.push(stream);
            } else {
                globalSubscriptions.set(stream, count);
            }
        }
    });

    if (streamsToUnsubscribe.length > 0 && binanceWs && binanceWs.readyState === WebSocket.OPEN) {
        const unsubscribeMessage: SubscriptionMessage = {
            method: "UNSUBSCRIBE",
            params: streamsToUnsubscribe,
            id: messageId++,
        };

        console.log(`📤 Unsubscribing from ${streamType}: ${streamsToUnsubscribe.join(", ")}`);
        sendToBinance(unsubscribeMessage); // Use rate-limited send
    }

    clientSubscriptions.set(ws, subscriptions);
    ws.send(
        JSON.stringify({
            success: true,
            message: `Unsubscribed. Current subscriptions: ${Object.keys(subscriptions).join(", ") || "none"}`,
        })
    );
};

// Unsubscribe from all streams for a client
const handleUnsubscribeAll = (ws: WebSocket) => {
    const subscriptions = clientSubscriptions.get(ws) || {};
    const streams = Object.keys(subscriptions);
    const streamsToUnsubscribe: string[] = [];

    streams.forEach((stream) => {
        // Decrement subscription count
        const count = (globalSubscriptions.get(stream) || 1) - 1;
        if (count <= 0) {
            globalSubscriptions.delete(stream);
            streamsToUnsubscribe.push(stream);
        } else {
            globalSubscriptions.set(stream, count);
        }
    });

    if (streamsToUnsubscribe.length > 0 && binanceWs && binanceWs.readyState === WebSocket.OPEN) {
        const unsubscribeMessage: SubscriptionMessage = {
            method: "UNSUBSCRIBE",
            params: streamsToUnsubscribe,
            id: messageId++,
        };

        console.log(`📤 Unsubscribing from all: ${streamsToUnsubscribe.join(", ")}`);
        sendToBinance(unsubscribeMessage); // Use rate-limited send
    }

    clientSubscriptions.set(ws, {});
    ws.send(
        JSON.stringify({
            success: true,
            message: "Unsubscribed from all streams",
        })
    );
};

// List subscriptions from Binance and compare with local state
const handleListSubscriptions = (ws: WebSocket) => {
    if (!binanceWs || binanceWs.readyState !== WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                success: false,
                error: "Not connected to Binance",
            })
        );
        return;
    }

    const requestId = messageId++;

    // Set up a one-time listener for the response
    const responseHandler = (data: WebSocket.Data) => {
        try {
            const response = JSON.parse(data.toString());
            // Check if this is the response to our LIST_SUBSCRIPTIONS request
            if (response.id === requestId && response.result !== undefined) {
                const binanceStreams: string[] = response.result;
                const localStreams = Array.from(globalSubscriptions.keys());

                // Find discrepancies
                const onlyInBinance = binanceStreams.filter((s) => !globalSubscriptions.has(s));
                const onlyInLocal = localStreams.filter((s) => !binanceStreams.includes(s));

                console.log(`📊 Subscription check - Binance: ${binanceStreams.length}, Local: ${localStreams.length}`);
                if (onlyInBinance.length > 0) {
                    console.log(`⚠️ Streams in Binance but not local: ${onlyInBinance.join(", ")}`);
                }
                if (onlyInLocal.length > 0) {
                    console.log(`⚠️ Streams in local but not Binance: ${onlyInLocal.join(", ")}`);
                }

                ws.send(
                    JSON.stringify({
                        success: true,
                        type: "subscriptionList",
                        binanceStreams,
                        localStreams,
                        localStreamCounts: Object.fromEntries(globalSubscriptions),
                        connectedClients: connectedClients.size,
                        discrepancies: {
                            onlyInBinance,
                            onlyInLocal,
                            inSync: onlyInBinance.length === 0 && onlyInLocal.length === 0,
                        },
                    })
                );

                // Remove this handler after receiving the response
                binanceWs?.off("message", responseHandler);
            }
        } catch {
            // Not a JSON response or not our response, ignore
        }
    };

    binanceWs.on("message", responseHandler);

    // Send LIST_SUBSCRIPTIONS request to Binance
    const listMessage: SubscriptionMessage = {
        method: "LIST_SUBSCRIPTIONS",
        id: requestId,
    };

    console.log(`📋 Requesting subscription list from Binance (id: ${requestId})`);
    binanceWs.send(JSON.stringify(listMessage));

    // Timeout to remove handler if no response
    setTimeout(() => {
        binanceWs?.off("message", responseHandler);
    }, 5000);
};

/**
 * Broadcast position update to all connected clients
 * This is used by the liquidation monitor service to notify clients of position changes
 */
export const broadcastPositionUpdate = (update: {
    type: "positionUpdate";
    action: "liquidated" | "closed";
    position: any;
    reason: "liquidation" | "take_profit" | "stop_loss" | "cross_margin_liquidation";
}): void => {
    const message = JSON.stringify(update);
    let sentCount = 0;

    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
                sentCount++;
            } catch (error) {
                console.error("Error sending position update to client:", error);
            }
        }
    });

    if (sentCount > 0) {
        console.log(
            `📤 Broadcasted position update to ${sentCount} client(s): ${update.action} - ${update.position.symbol}${update.position.base_currency}`
        );
    }
};
