import { Router } from 'express';
import { ExpenseController } from '../controllers/expenses';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware';
import { expenseParamsZSchema, tripParamsZSchema } from '../models/common';
import { expenseQueryZSchema, expenseZSchema } from '../models/expenses';

// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const expenseController = new ExpenseController();

router.get('/', validateParams(tripParamsZSchema), validateQuery(expenseQueryZSchema), expenseController.getExpenses);
router.get('/:expenseId', validateParams(expenseParamsZSchema), expenseController.getExpenseById);
router.post('/', validateParams(tripParamsZSchema), validate(expenseZSchema), expenseController.createExpense);
router.put('/:expenseId', validateParams(expenseParamsZSchema), validate(expenseZSchema), expenseController.updateExpense);
router.delete('/:expenseId', validateParams(expenseParamsZSchema), expenseController.deleteExpense);

export default router;