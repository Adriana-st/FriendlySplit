import { Request, Response } from 'express';
import { ExpenseService } from '../services/expenses';
import { ExpenseQuery } from '../models/expenses';
import { handleError } from '../utils/errors';
import { listResponse } from '../utils/helpers';

const expenseService = new ExpenseService();

export class ExpenseController {

  getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = res.locals.query as ExpenseQuery;
      const { expenses, total } = await expenseService.getExpenses(req.params.tripId as string, query);
      res.status(200).json(listResponse(expenses, query.page, query.limit, total));
    } catch (error) {
      handleError(res, error, 'Error fetching expenses');
    }
  };

  getExpenseById = async (req: Request, res: Response): Promise<void> => {
    try {
      const expense = await expenseService.getExpenseById(req.params.tripId as string, req.params.expenseId as string);
      if (!expense) {
        res.status(404).json({ message: 'Expense not found' });
        return;
      }
      res.status(200).json(expense);
    } catch (error) {
      handleError(res, error, 'Error fetching expense');
    }
  };

  createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
      const tripId = req.params.tripId as string;
      const newExpense = await expenseService.createExpense(tripId, req.body);
      res.status(201).location(`/api/v1/trips/${tripId}/expenses/${newExpense._id}`).json(newExpense);
    } catch (error) {
      handleError(res, error, 'Error creating expense');
    }
  };

  updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
      const updatedExpense = await expenseService.updateExpense(
        req.params.tripId as string,
        req.params.expenseId as string,
        req.body
      );
      if (!updatedExpense) {
        res.status(404).json({ message: 'Expense not found' });
        return;
      }
      res.status(200).json(updatedExpense);
    } catch (error) {
      handleError(res, error, 'Error updating expense');
    }
  };

  deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedExpense = await expenseService.deleteExpense(req.params.tripId as string, req.params.expenseId as string);
      if (!deletedExpense) {
        res.status(404).json({ message: 'Expense not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Error deleting expense');
    }
  };

}