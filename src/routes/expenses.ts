import { Router } from 'express';
import { ExpenseController } from '../controllers/expenses';
import { validate, validateIds, validateQuery } from '../middleware/validate.middleware';
import { expenseQueryZSchema, expenseZSchema } from '../models/expenses';

// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const expenseController = new ExpenseController();

router.get('/', validateIds, validateQuery(expenseQueryZSchema), expenseController.getExpenses);
router.get('/:expenseId', validateIds, expenseController.getExpenseById);
router.post('/', validateIds, validate(expenseZSchema), expenseController.createExpense);
router.put('/:expenseId', validateIds, validate(expenseZSchema), expenseController.updateExpense);
router.delete('/:expenseId', validateIds, expenseController.deleteExpense);

export default router;