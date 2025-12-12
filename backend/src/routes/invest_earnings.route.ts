import { Router } from "express";
import * as InvestEarningsController from "../controllers/invest_earnings.controller";
import { auth, onlyAdmin } from "../middlewares";

const InvestEarningsRouter = Router();

InvestEarningsRouter.get("/all", onlyAdmin, InvestEarningsController.adminGetEarnings);
InvestEarningsRouter.get("/", auth, InvestEarningsController.getEarningsByUser);

InvestEarningsRouter.post("/delete/:id", onlyAdmin, InvestEarningsController.adminDeleteEarning);
InvestEarningsRouter.post("/", onlyAdmin, InvestEarningsController.adminCreateEarning);

export { InvestEarningsRouter };
