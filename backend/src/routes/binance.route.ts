import { Router } from "express";

import * as BinanceController from "../controllers/binance.controller";

const BinanceRouter = Router();

BinanceRouter.get("/pairs", BinanceController.fetchPairs);

export { BinanceRouter };
