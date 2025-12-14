import { Router } from "express";
import * as SettingsController from "../controllers/settings.controller";

const SettingsRouter = Router();

SettingsRouter.get("/login-background", SettingsController.getLoginBackground);
SettingsRouter.post(
  "/login-background",
  SettingsController.updateLoginBackground
);
SettingsRouter.delete(
  "/login-background",
  SettingsController.deleteLoginBackground
);

export { SettingsRouter };
