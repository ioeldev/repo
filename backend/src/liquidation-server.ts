import dotenv from "dotenv";
dotenv.config();

import "source-map-support/register";

import WebSocket from "ws";
import { connect } from "./config/db";
import { liquidationMonitor } from "./services/liquidation-monitor.service";

const LIQUIDATION_WS_PORT = parseInt(process.env.LIQUIDATION_WS_PORT || "3335");

interface PositionUpdate {
    type: "positionUpdate";
    action: "liquidated" | "closed";
    position: any;
    reason: "liquidation" | "take_profit" | "stop_loss" | "cross_margin_liquidation";
}

const startLiquidationServer = async () => {
    console.log("🚀 Starting Liquidation Monitor Server...");

    // Connect to MongoDB (same database as main server)
    await connect();
    console.log("✅ Connected to MongoDB");

    // Create WebSocket server for position updates
    const wss = new WebSocket.Server({
        port: LIQUIDATION_WS_PORT,
    });

    console.log(`🔌 Liquidation WebSocket server running on port ${LIQUIDATION_WS_PORT}`);

    // Track connected clients
    const connectedClients = new Set<WebSocket>();

    wss.on("connection", (ws: WebSocket) => {
        console.log("👤 Client connected to liquidation monitor");
        connectedClients.add(ws);

        ws.on("close", () => {
            console.log("👤 Client disconnected from liquidation monitor");
            connectedClients.delete(ws);
        });

        ws.on("error", (error) => {
            console.error("Liquidation WebSocket error:", error);
        });

        // Send welcome message
        ws.send(
            JSON.stringify({
                type: "welcome",
                message: "Connected to Liquidation Monitor",
                server: "liquidation-monitor",
            })
        );
    });

    // Register callback to broadcast position updates to connected clients
    liquidationMonitor.onPositionUpdate((update: PositionUpdate) => {
        const message = JSON.stringify(update);
        let sentCount = 0;

        connectedClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    console.error("Error sending position update:", error);
                }
            }
        });

        if (sentCount > 0) {
            console.log(`📤 Broadcasted position update to ${sentCount} client(s): ${update.action} - ${update.position.symbol}${update.position.base_currency}`);
        }
    });

    // Start monitoring
    await liquidationMonitor.startMonitoring();
    console.log("✅ Liquidation Monitor running");

    // Graceful shutdown
    const shutdown = () => {
        console.log("🛑 Shutting down liquidation server...");
        liquidationMonitor.stopMonitoring();
        wss.close(() => {
            console.log("✅ Liquidation server closed");
            process.exit(0);
        });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

startLiquidationServer().catch((error) => {
    console.error("❌ Failed to start liquidation server:", error);
    process.exit(1);
});

