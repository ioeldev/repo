import { Router } from "express";
import * as IPC from "../controllers/investment_products.controller";
import { auth, onlyAdmin } from "../middlewares";

const InvestmentProductsRouter = Router();

InvestmentProductsRouter.get("/", auth, IPC.getInvestmentProducts);
InvestmentProductsRouter.get("/:id", IPC.getInvestmentProductById);

InvestmentProductsRouter.post("/:id/request", auth, IPC.requestToInvest);
InvestmentProductsRouter.post("/:id/approve", onlyAdmin, IPC.addProductToUser);
InvestmentProductsRouter.post("/:id/decline", onlyAdmin, IPC.removeProductRequestFromUser);
InvestmentProductsRouter.post("/:id/remove", onlyAdmin, IPC.removeProductFromUser);
InvestmentProductsRouter.post("/:id/cancel", onlyAdmin, IPC.cancelProductForUser);
InvestmentProductsRouter.post("/:id/add_funds", onlyAdmin, IPC.addFundsToProduct);

InvestmentProductsRouter.post(
    "/:id/allowed_users",
    onlyAdmin,
    IPC.adminUpdateAllowedUsersForProduct,
);
InvestmentProductsRouter.post("/:id", onlyAdmin, IPC.adminUpdateInvestmentProduct);
InvestmentProductsRouter.post("/", onlyAdmin, IPC.adminCreateInvestmentProduct);

InvestmentProductsRouter.delete("/:id", onlyAdmin, IPC.adminDeleteInvestmentProduct);

export { InvestmentProductsRouter };
