import { Router } from "express";
import * as PositionsControllerV2 from "../controllers/positions.v2.controller";
import { auth, onlyAdmin } from "../middlewares";

const PositionsV2Router = Router();

// User routes
PositionsV2Router.get("/", auth, PositionsControllerV2.getMyPositions);
PositionsV2Router.get("/stats", auth, PositionsControllerV2.getMyPositionStats);
PositionsV2Router.get("/fees", auth, PositionsControllerV2.getTotalFeesTakenByUser);
PositionsV2Router.get("/pnl-history", auth, PositionsControllerV2.getPnLHistory);
PositionsV2Router.post("/", auth, PositionsControllerV2.createPosition);
PositionsV2Router.post("/close", auth, PositionsControllerV2.closePosition);

// Admin routes
PositionsV2Router.get("/admin", auth, PositionsControllerV2.getAllPositions);
PositionsV2Router.get("/admin/fees/:user_id", auth, PositionsControllerV2.adminGetTotalFeesTakenByUser);
PositionsV2Router.post("/admin", onlyAdmin, PositionsControllerV2.adminCreatePosition);
PositionsV2Router.post("/admin/batch", onlyAdmin, PositionsControllerV2.adminCreatePositions);
PositionsV2Router.post("/admin/:id", onlyAdmin, PositionsControllerV2.adminUpdatePosition);
PositionsV2Router.put("/admin/batch", onlyAdmin, PositionsControllerV2.adminUpdatePositions);
PositionsV2Router.delete("/admin/:id", onlyAdmin, PositionsControllerV2.adminDeletePosition);

export { PositionsV2Router };
