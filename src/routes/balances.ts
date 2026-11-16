import { Router } from 'express';
import { BalanceController } from '../controllers/balances';
import { validateIds } from '../middleware/validate.middleware';


// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const balanceController = new BalanceController();

router.get('/', validateIds, balanceController.getBalances);

export default router;