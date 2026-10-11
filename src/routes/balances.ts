import { Router } from 'express';
import { BalanceController } from '../controllers/balances';
import { validateParams } from '../middleware/validate.middleware';
import { tripParamsZSchema } from '../models/common';

// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const balanceController = new BalanceController();

router.get('/', validateParams(tripParamsZSchema), balanceController.getBalances);

export default router;