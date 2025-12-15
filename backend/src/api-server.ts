import dotenv from "dotenv";
dotenv.config();

import "source-map-support/register";

import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

import serverless from "serverless-http";
import { connect } from "./config/db";

import { UsersRouter } from "./routes/users.route";
import { PositionsRouter } from "./routes/positions.route";
import { AuthRouter } from "./routes/auth.route";
import { MexcRouter } from "./routes/mexc.route";
import { RobotsRouter } from "./routes/robots.route";
import { RobotsEarningsRouter } from "./routes/robots_earnings.route";
import { InvestmentProductsRouter } from "./routes/investment_products.route";
import { RobotsEarnings } from "./models/robots_earnings.model";
import { SettingsRouter } from "./routes/settings.route";
import { BinanceRouter } from "./routes/binance.route";

import moment from "moment-timezone";
import "moment/locale/fr";
import { StocksRouter } from "./routes/stocks.route";
import { InvestEarningsRouter } from "./routes/invest_earnings.route";
import WebSocket from "ws";
import { initWebSocket } from "./workers/binance.worker";

moment.tz.setDefault("Europe/Paris");
moment.locale("fr");

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());
app.use(cors());
app.use(fileUpload());

app.get("/", (req, res) => {
    res.send("Hello, Express!");
});

app.use("/users", UsersRouter);
app.use("/positions", PositionsRouter);
app.use("/robots", RobotsRouter);
app.use("/robots_earnings", RobotsEarningsRouter);
app.use("/auth", AuthRouter);
app.use("/mexc", MexcRouter);
app.use("/binance", BinanceRouter);
app.use("/stocks", StocksRouter);
app.use("/investment_products", InvestmentProductsRouter);
app.use("/invest_earnings", InvestEarningsRouter);
app.use("/settings", SettingsRouter);

const server = app.listen(port, () => {
  console.log(`🔌 HTTP server is running on port ${port}`);
});

const wss = new WebSocket.Server({ server });

(async () => {
  try {
    await connect();
    await RobotsEarnings.collection.createIndex(
      { robot_id: 1, user_id: 1, date: 1 },
      { unique: true }
    );

    initWebSocket(wss);
    console.log(`🔌 WebSocket server is running on port ${port}`);
  } catch (err) {
    console.error("Fatal init error:", err);
    server.close(() => process.exit(1));
  }
})();

server.on("error", (err) => {
  console.error("HTTP server error:", err);
});
wss.on("error", (err) => {
  console.error("WebSocket server error:", err);
});
