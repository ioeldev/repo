import { Router } from 'express';
import * as RobotsEarningsController from '../controllers/robots_earnings.controller';
import { auth, onlyAdmin } from '../middlewares';

const RobotsEarningsRouter = Router();

RobotsEarningsRouter.get('/', auth, RobotsEarningsController.getRewardsByUser);
RobotsEarningsRouter.get('/:userId', onlyAdmin, RobotsEarningsController.adminGetRewardsByUser);

export { RobotsEarningsRouter };
