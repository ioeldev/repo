import { Router } from "express";
import * as PositionsControllerV2 from "../controllers/positions.v2.controller";
import { auth, onlyAdmin } from "../middlewares";

const PositionsRouter = Router();

// User routes
PositionsRouter.get("/", auth, PositionsControllerV2.getMyPositions);
PositionsRouter.get("/stats", auth, PositionsControllerV2.getMyPositionStats);
PositionsRouter.get("/fees", auth, PositionsControllerV2.getTotalFeesTakenByUser);
PositionsRouter.get("/pnl-history", auth, PositionsControllerV2.getPnLHistory);
PositionsRouter.post("/", auth, PositionsControllerV2.createPosition);
PositionsRouter.post("/close", auth, PositionsControllerV2.closePosition);

// Admin routes
PositionsRouter.get("/admin", auth, PositionsControllerV2.getAllPositions);
PositionsRouter.get("/admin/fees/:user_id", auth, PositionsControllerV2.adminGetTotalFeesTakenByUser);
PositionsRouter.post("/admin", onlyAdmin, PositionsControllerV2.adminCreatePosition);
PositionsRouter.post("/admin/batch", onlyAdmin, PositionsControllerV2.adminCreatePositions);
PositionsRouter.post("/admin/:id", onlyAdmin, PositionsControllerV2.adminUpdatePosition);
PositionsRouter.put("/admin/batch", onlyAdmin, PositionsControllerV2.adminUpdatePositions);
PositionsRouter.delete("/admin/:id", onlyAdmin, PositionsControllerV2.adminDeletePosition);

export { PositionsRouter };
