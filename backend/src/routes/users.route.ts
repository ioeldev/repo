import { Router } from "express";
import * as UsersController from "../controllers/users.controller";
import { onlyAdmin, auth } from "../middlewares";

const UsersRouter = Router();

UsersRouter.get("/", onlyAdmin, UsersController.getAllUsers);
UsersRouter.get("/admin", onlyAdmin, UsersController.getAllAdmins);

UsersRouter.get(
  "/deposit_and_withdraw",
  onlyAdmin,
  UsersController.adminGetAllDepositsAndWithdraws
);
UsersRouter.get("/:id", onlyAdmin, UsersController.getUserById);

UsersRouter.post(
  "/robot_balance",
  onlyAdmin,
  UsersController.updateUserRobotBalance
);
UsersRouter.post(
  "/invest_balance",
  onlyAdmin,
  UsersController.updateUserInvestBalance
);
UsersRouter.post("/balance", onlyAdmin, UsersController.createUserBalance);
UsersRouter.post(
  "/balance/:currency",
  onlyAdmin,
  UsersController.updateUserBalance
);

UsersRouter.post("/deposit/request", auth, UsersController.requestDeposit);
UsersRouter.post(
  "/deposit/approve",
  onlyAdmin,
  UsersController.adminApproveDeposit
);
UsersRouter.post(
  "/deposit/decline",
  onlyAdmin,
  UsersController.adminDeclineDeposit
);
UsersRouter.post(
  "/deposit/cancel",
  onlyAdmin,
  UsersController.adminCancelDeposit
);
UsersRouter.post('/deposit/delete', onlyAdmin, UsersController.adminDeleteDeposit);

UsersRouter.post("/withdraw/request", auth, UsersController.requestWithdraw);
UsersRouter.post(
  "/withdraw/approve",
  onlyAdmin,
  UsersController.adminApproveWithdraw
);
UsersRouter.post(
  "/withdraw/decline",
  onlyAdmin,
  UsersController.adminDeclineWithdraw
);
UsersRouter.post(
  "/withdraw/cancel",
  onlyAdmin,
  UsersController.adminCancelWithdraw
);

UsersRouter.post("/me", auth, UsersController.updateUser);

UsersRouter.post("/message", auth, UsersController.sendMessage);
UsersRouter.post("/clear-chat", auth, UsersController.clearChat);
UsersRouter.post("/message/opened", auth, UsersController.setMessageAsOpened);

UsersRouter.post("/password", auth, UsersController.updateUserPassword);
UsersRouter.post("/infos/:id", onlyAdmin, UsersController.updateUserInfos);
UsersRouter.post("/:id", onlyAdmin, UsersController.updateUserAdmin);

UsersRouter.delete("/:id", onlyAdmin, UsersController.deleteUser);

export { UsersRouter };
