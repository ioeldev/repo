import { Router } from 'express';

import * as StocksController from '../controllers/stocks.controller';

const StocksRouter = Router();

StocksRouter.get('/pairs', StocksController.fetchPairs);

export { StocksRouter };
