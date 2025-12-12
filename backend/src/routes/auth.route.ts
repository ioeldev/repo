import { Router } from "express";
import * as AuthController from "../controllers/auth.controller";
import { auth, onlyAdmin } from "../middlewares";

const AuthRouter = Router();

AuthRouter.post("/login", AuthController.login);
AuthRouter.post("/signup", onlyAdmin, AuthController.signup);
AuthRouter.post("/impersonate/:userId", onlyAdmin, AuthController.impersonate);
AuthRouter.get("/me", auth, AuthController.get_me);
AuthRouter.get("/me/dashboard-summary", auth, AuthController.get_dashboard_summary);
AuthRouter.post("/refresh_token", AuthController.refresh_token);

export { AuthRouter };
