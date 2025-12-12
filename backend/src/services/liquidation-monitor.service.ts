/**
 * Real-time Liquidation Monitor Service
 *
 * Monitors all open positions via Binance WebSocket and liquidates positions
 * instantly when thresholds are crossed. Works independently in the background.
 */

import WebSocket from "ws";
import { Position, PositionsModel } from "../models/positions.model";
import { User } from "../models/users.model";
import { ObjectId } from "mongodb";
import { calculateUnrealizedPnl } from "../utils/pnl";
import { invokeEmailSender } from "../utils/lambda_invokes";
import { getClosePositionEmailContent, getLiquidatePositionEmailContent } from "../utils/email_content";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
const POSITION_REFRESH_INTERVAL = 60000; // Refresh positions from DB every 60 seconds
const RECONNECT_DELAY_MS = 5000;
const CONNECTION_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours (reconnect before 24h limit)

interface PositionUpdate {
    type: "positionUpdate";
    action: "liquidated" | "closed";
    position: PositionsModel;
    reason: "liquidation" | "take_profit" | "stop_loss" | "cross_margin_liquidation";
}

type BroadcastCallback = (update: PositionUpdate) => void;

class LiquidationMonitorService {
    private binanceWs: WebSocket | null = null;
    private positionMap = new Map<string, PositionsModel[]>(); // tradingPair (symbol+baseCurrency) -> positions
    private priceCache = new Map<string, number>(); // tradingPair -> currentPrice
    private isMonitoring = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private positionRefreshInterval: NodeJS.Timeout | null = null;
    private connectionAgeTimeout: NodeJS.Timeout | null = null;
    private broadcastCallbacks: Set<BroadcastCallback> = new Set();

    /**
     * Register a callback to receive position updates
     */
    public onPositionUpdate(callback: BroadcastCallback): () => void {
        this.broadcastCallbacks.add(callback);
        // Return unsubscribe function
        return () => {
            this.broadcastCallbacks.delete(callback);
        };
    }

    /**
     * Broadcast position update to all registered callbacks
     */
    private broadcastPositionUpdate(update: PositionUpdate): void {
        this.broadcastCallbacks.forEach((callback) => {
            try {
                callback(update);
            } catch (error) {
                console.error("Error in position update callback:", error);
            }
        });
    }

    /**
     * Start monitoring all open positions
     */
    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            console.log("Liquidation monitor is already running");
            return;
        }

        console.log("🚀 Starting real-time liquidation monitor...");

        // Load all open positions from database
        await this.refreshOpenPositions();

        // Connect to Binance WebSocket
        await this.connectToBinance();

        // Set up periodic position refresh
        this.positionRefreshInterval = setInterval(() => {
            this.refreshOpenPositions().catch((error) => {
                console.error("Error refreshing positions:", error);
            });
        }, POSITION_REFRESH_INTERVAL);

        this.isMonitoring = true;
        console.log("✅ Liquidation monitor started successfully");
    }

    /**
     * Stop monitoring
     */
    public stopMonitoring(): void {
        console.log("🛑 Stopping liquidation monitor...");
        this.isMonitoring = false;

        if (this.binanceWs) {
            this.binanceWs.close();
            this.binanceWs = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.positionRefreshInterval) {
            clearInterval(this.positionRefreshInterval);
            this.positionRefreshInterval = null;
        }

        if (this.connectionAgeTimeout) {
            clearTimeout(this.connectionAgeTimeout);
            this.connectionAgeTimeout = null;
        }

        this.positionMap.clear();
        this.priceCache.clear();
        console.log("✅ Liquidation monitor stopped");
    }

    /**
     * Schedule a reconnection before the 24-hour connection limit
     */
    private scheduleConnectionRefresh(): void {
        // Clear any existing timeout
        if (this.connectionAgeTimeout) {
            clearTimeout(this.connectionAgeTimeout);
            this.connectionAgeTimeout = null;
        }

        // Schedule reconnection before 24-hour limit
        this.connectionAgeTimeout = setTimeout(() => {
            console.log(
                "⏰ [LiquidationMonitor] Connection approaching 24-hour limit, initiating proactive reconnect..."
            );
            if (this.binanceWs) {
                this.binanceWs.close(1000, "Scheduled reconnection before 24h limit");
            }
        }, CONNECTION_MAX_AGE_MS);

        console.log(
            `⏰ [LiquidationMonitor] Scheduled connection refresh in ${CONNECTION_MAX_AGE_MS / 1000 / 60 / 60} hours`
        );
    }

    /**
     * Subscribe to the all market tickers stream
     */
    private subscribeToTickers(): void {
        if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
            console.error("[LiquidationMonitor] Cannot subscribe: WebSocket not open");
            return;
        }

        const subscribeMessage = {
            method: "SUBSCRIBE",
            params: ["!miniTicker@arr"],
            id: 1,
        };

        this.binanceWs.send(JSON.stringify(subscribeMessage));
        console.log("📊 [LiquidationMonitor] Subscribed to all market mini tickers stream");
    }

    /**
     * Connect to Binance WebSocket and subscribe to all market tickers
     */
    private async connectToBinance(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.binanceWs = new WebSocket(BINANCE_WS_URL);

                this.binanceWs.on("open", () => {
                    console.log("📡 [LiquidationMonitor] Connected to Binance WebSocket");

                    // Schedule proactive reconnection before 24h limit
                    this.scheduleConnectionRefresh();

                    // Subscribe to all market tickers stream
                    this.subscribeToTickers();

                    resolve();
                });

                this.binanceWs.on("message", (data: WebSocket.Data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleTickerUpdate(message);
                    } catch (error) {
                        console.error("Error parsing Binance message:", error);
                    }
                });

                this.binanceWs.on("error", (error) => {
                    console.error("❌ [LiquidationMonitor] Binance WebSocket error:", error);
                    reject(error);
                });

                this.binanceWs.on("close", (code, reason) => {
                    const reasonStr = reason?.toString() || "none";
                    console.log(
                        `🔌 [LiquidationMonitor] Disconnected from Binance WebSocket. Code: ${code}, Reason: ${reasonStr}`
                    );

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
                        console.log(`📋 [LiquidationMonitor] Close code meaning: ${closeCodeDescriptions[code]}`);
                    }

                    this.binanceWs = null;

                    // Clear connection age timeout
                    if (this.connectionAgeTimeout) {
                        clearTimeout(this.connectionAgeTimeout);
                        this.connectionAgeTimeout = null;
                    }

                    // Attempt to reconnect after 5 seconds
                    if (this.isMonitoring) {
                        this.reconnectTimeout = setTimeout(() => {
                            console.log("🔄 [LiquidationMonitor] Attempting to reconnect to Binance...");
                            this.connectToBinance().catch((err) => {
                                console.error("Reconnection failed:", err);
                            });
                        }, RECONNECT_DELAY_MS);
                    }
                });

                // Handle ping frames - ws library auto-responds with pong
                this.binanceWs.on("ping", () => {
                    console.log("🏓 [LiquidationMonitor] Received ping from Binance (ws library auto-responds)");
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle ticker updates from Binance
     */
    private handleTickerUpdate(message: any): void {
        // Handle array of 24hrMiniTicker events (all market mini tickers stream)
        if (Array.isArray(message)) {
            message.forEach((ticker: any) => {
                if (ticker.e === "24hrMiniTicker" && ticker.s) {
                    const binanceSymbol = ticker.s; // e.g., SOLUSDT
                    const currentPrice = parseFloat(ticker.c);

                    // Cache price for the full symbol
                    this.priceCache.set(binanceSymbol, currentPrice);

                    // Check positions for this trading pair
                    this.checkPositionsForSymbol(binanceSymbol, currentPrice);
                }
            });
        }
        // Also handle individual ticker updates
        else if (message.e === "24hrMiniTicker" && message.s) {
            const binanceSymbol = message.s;
            const currentPrice = parseFloat(message.c);

            this.priceCache.set(binanceSymbol, currentPrice);
            this.checkPositionsForSymbol(binanceSymbol, currentPrice);
        }
        // Handle subscription response
        else if (message.result === null && message.id !== undefined) {
            console.log(`✅ [LiquidationMonitor] Subscription confirmed (id: ${message.id})`);
        }
    }

    /**
     * Check all positions for a given symbol
     */
    private async checkPositionsForSymbol(symbol: string, currentPrice: number): Promise<void> {
        const positions = this.positionMap.get(symbol);
        if (!positions || positions.length === 0) {
            return;
        }

        // Check each position
        for (const position of positions) {
            // Skip if position is already closed (may happen due to async operations)
            if (position.status !== "open") {
                continue;
            }

            // Check take-profit and stop-loss first
            if (position.take_profit) {
                const takeProfitHit =
                    position.type === "buy"
                        ? currentPrice >= position.take_profit
                        : currentPrice <= position.take_profit;

                if (takeProfitHit) {
                    console.log(
                        `🎯 [LiquidationMonitor] Take-profit triggered for ${symbol}: currentPrice=${currentPrice}, TP=${position.take_profit}, type=${position.type}`
                    );
                    await this.handlePositionClose(position, currentPrice, false, "take_profit");
                    continue;
                }
            }

            if (position.stop_loss) {
                const stopLossHit =
                    position.type === "buy" ? currentPrice <= position.stop_loss : currentPrice >= position.stop_loss;

                if (stopLossHit) {
                    console.log(
                        `🛑 [LiquidationMonitor] Stop-loss triggered for ${symbol}: currentPrice=${currentPrice}, SL=${position.stop_loss}, type=${position.type}`
                    );
                    await this.handlePositionClose(position, currentPrice, false, "stop_loss");
                    continue;
                }
            }

            // Check liquidation price if available
            if (position.liquidation_price) {
                const shouldLiquidate =
                    position.type === "buy"
                        ? currentPrice <= position.liquidation_price
                        : currentPrice >= position.liquidation_price;

                // Debug log for positions near liquidation (within 5%)
                const distanceToLiquidation = Math.abs(
                    (currentPrice - position.liquidation_price) / position.liquidation_price
                );
                if (distanceToLiquidation < 0.05) {
                    console.log(
                        `⚠️ [LiquidationMonitor] Position near liquidation for ${symbol}: currentPrice=${currentPrice}, liqPrice=${
                            position.liquidation_price
                        }, type=${position.type}, distance=${(distanceToLiquidation * 100).toFixed(2)}%`
                    );
                }

                if (shouldLiquidate) {
                    console.log(
                        `💥 [LiquidationMonitor] Liquidation triggered for ${symbol}: currentPrice=${currentPrice}, liqPrice=${position.liquidation_price}, type=${position.type}, positionId=${position._id}`
                    );
                    await this.handlePositionClose(position, currentPrice, true, "liquidation");
                    continue;
                }
            }
        }
    }

    /**
     * Handle individual position close
     */
    private async handlePositionClose(
        position: PositionsModel,
        currentPrice: number,
        isLiquidation: boolean,
        reason: "liquidation" | "take_profit" | "stop_loss"
    ): Promise<void> {
        console.log(
            `${isLiquidation ? "💥 Liquidation" : "✅ Closing position"} for ${position.symbol}${
                position.base_currency
            } - Reason: ${reason}`
        );

        // Calculate PnL
        const pnl = calculateUnrealizedPnl(
            position.type as "buy" | "sell",
            position.entry_price,
            currentPrice,
            position.quantity
        );

        // Amount to update balance = margin + PnL
        const amountToUpdateBalance = position.base_currency_amount + pnl;

        const exitTime = new Date();

        // Update position status
        await Position.updateOneById(position._id!, {
            status: "closed",
            exit_price: currentPrice,
            exit_time: exitTime,
            liquidated: isLiquidation,
        });

        // Update user balance
        await User.updateBalance(position.user_id, position.base_currency, amountToUpdateBalance);

        // Remove from tracking
        this.removePositionFromTracking(position);

        // Broadcast update
        const updatedPosition = await Position.findOneById(position._id!);
        if (updatedPosition) {
            this.broadcastPositionUpdate({
                type: "positionUpdate",
                action: isLiquidation ? "liquidated" : "closed",
                position: updatedPosition,
                reason,
            });
        }

        // Isolated margin: no need to recalculate other positions

        // Send email notification
        try {
            const user = await User.findOneById(position.user_id);
            if (!user?.email) return;

            const emailParams = {
                symbol: `${position.symbol}/${position.base_currency}`,
                type: position.type,
                quantity: position.quantity,
                entryPrice: position.entry_price,
                entryDate: position.entry_time,
                exitPrice: currentPrice,
                exitDate: exitTime,
                leverage: position.leverage || 1,
                baseCurrency: position.base_currency,
                pnl,
                dashboardUrl: process.env.DASHBOARD_URL,
                logoUrl: process.env.LOGO_URL,
            };

            const emailContent = isLiquidation
                ? getLiquidatePositionEmailContent(emailParams)
                : getClosePositionEmailContent(emailParams);

            await invokeEmailSender({
                to: user.email,
                subject: isLiquidation ? "Position liquidée" : "Position clôturée",
                html: emailContent,
            });
        } catch (e) {
            console.log("Error sending email", e);
        }
    }

    /**
     * Refresh open positions from database
     */
    public async refreshOpenPositions(): Promise<void> {
        try {
            const openPositions = await Position.collection.find({ status: "open" }).toArray();

            // Clear existing maps
            this.positionMap.clear();

            // Rebuild position maps
            for (const position of openPositions) {
                // Construct full trading pair: symbol + base_currency (e.g., SOL + USDT = SOLUSDT)
                const tradingPair = `${position.symbol}${position.base_currency}`.toUpperCase();

                // Debug log for positions with liquidation prices
                if (position.liquidation_price) {
                    console.log(
                        `📋 [LiquidationMonitor] Tracking position ${position._id}: pair=${tradingPair}, type=${position.type}, liqPrice=${position.liquidation_price}, entryPrice=${position.entry_price}`
                    );
                }

                // Add to position map using full trading pair
                if (!this.positionMap.has(tradingPair)) {
                    this.positionMap.set(tradingPair, []);
                }
                this.positionMap.get(tradingPair)!.push(position);
            }

            console.log(`📊 Refreshed ${openPositions.length} open positions`);
        } catch (error) {
            console.error("Error refreshing open positions:", error);
            throw error;
        }
    }

    /**
     * Add a new position to tracking
     */
    public addPositionToTracking(position: PositionsModel): void {
        if (position.status !== "open") return;

        // Construct full trading pair: symbol + base_currency
        const tradingPair = `${position.symbol}${position.base_currency}`.toUpperCase();
        if (!this.positionMap.has(tradingPair)) {
            this.positionMap.set(tradingPair, []);
        }
        this.positionMap.get(tradingPair)!.push(position);
    }

    /**
     * Remove a position from tracking
     */
    public removePositionFromTracking(position: PositionsModel): void {
        // Construct full trading pair: symbol + base_currency
        const tradingPair = `${position.symbol}${position.base_currency}`.toUpperCase();
        const positions = this.positionMap.get(tradingPair);
        if (positions) {
            const index = positions.findIndex((p) => p._id?.toString() === position._id?.toString());
            if (index !== -1) {
                positions.splice(index, 1);
            }
            if (positions.length === 0) {
                this.positionMap.delete(tradingPair);
            }
        }
    }

    /**
     * Update a position in tracking (remove old version, add updated version)
     * Used after position modifications like merging
     */
    public updatePositionInTracking(position: PositionsModel): void {
        // Remove old version first
        this.removePositionFromTracking(position);
        // Add updated version if still open
        if (position.status === "open") {
            this.addPositionToTracking(position);
        }
    }
}

// Export singleton instance
export const liquidationMonitor = new LiquidationMonitorService();
