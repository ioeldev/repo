import { Router } from "express";
import * as PositionsController from "../controllers/positions.controller";
import { auth, onlyAdmin } from "../middlewares";

const PositionsRouter = Router();

PositionsRouter.get("/", auth, PositionsController.getMyPositions);
PositionsRouter.get("/fees", auth, PositionsController.getTotalFeesTakenByUser);
PositionsRouter.get("/admin", auth, PositionsController.getAllPositions);
PositionsRouter.get("/admin/fees/:user_id", auth, PositionsController.adminGetTotalFeesTakenByUser);

PositionsRouter.post(
  "/admin",
  onlyAdmin,
  PositionsController.adminCreatePosition
);
PositionsRouter.post(
  "/admin/batch",
  onlyAdmin,
  PositionsController.adminCreatePositions
);
PositionsRouter.post(
  "/admin/:id",
  onlyAdmin,
  PositionsController.adminUpdatePosition
);
PositionsRouter.put(
  "/admin/batch",
  onlyAdmin,
  PositionsController.adminUpdatePositions
);
PositionsRouter.post("/close", auth, PositionsController.closePosition);
PositionsRouter.post("/", auth, PositionsController.createPosition);

PositionsRouter.delete(
  "/admin/:id",
  onlyAdmin,
  PositionsController.adminDeletePosition
);

export { PositionsRouter };
