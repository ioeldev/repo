import {Router} from 'express';

import * as MexcController from '../controllers/mexc.controller';

const MexcRouter = Router();

MexcRouter.get('/pairs', MexcController.fetchPairs);

export {MexcRouter};