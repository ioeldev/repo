import { Router } from "express";
import * as RobotsController from "../controllers/robots.controller";
import { auth, onlyAdmin } from '../middlewares';

const RobotsRouter = Router();

RobotsRouter.get("/", auth, RobotsController.getAllRobots);

RobotsRouter.post("/:id/request", auth, RobotsController.requestToJoinRobot);
RobotsRouter.post("/:id/approve", onlyAdmin, RobotsController.addRobotToUser);
RobotsRouter.post("/:id/decline", auth, RobotsController.removeRobotRequestFromUser);
RobotsRouter.post("/:id/remove", auth, RobotsController.removeRobotFromUser);
RobotsRouter.post("/:id/add_funds", auth, RobotsController.addFundsToRobot);

RobotsRouter.post("/:id", onlyAdmin, RobotsController.updateRobot);
RobotsRouter.post("/", onlyAdmin, RobotsController.createRobot);

RobotsRouter.delete("/:id", onlyAdmin, RobotsController.deleteRobot);

export { RobotsRouter };
