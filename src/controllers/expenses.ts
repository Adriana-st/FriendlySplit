import { Request, Response } from 'express';
import { ExpenseService } from '../services/expenses';
import { ExpenseQuery } from '../models/expenses';
import { handleError } from '../utils/errors';
import { listResponse } from '../utils/helpers';

const expenseService = new ExpenseService();

export class ExpenseController {

    /**
     * @openapi
     * /trips/{tripId}/expenses:
     *   get:
     *     summary: List the expenses of a trip (filter, sort, project and page)
     *     tags:
     *       - Expenses
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - in: query
     *         name: category
     *         schema:
     *           $ref: '#/components/schemas/Category'
     *       - in: query
     *         name: paidBy
     *         description: Only expenses paid by this participant
     *         schema:
     *           $ref: '#/components/schemas/ObjectId'
     *       - in: query
     *         name: search
     *         description: Partial, case-insensitive match on the description
     *         schema:
     *           type: string
     *           maxLength: 60
     *       - in: query
     *         name: minAmount
     *         description: Minimum amount in cents
     *         schema:
     *           type: integer
     *           minimum: 0
     *       - in: query
     *         name: maxAmount
     *         description: Maximum amount in cents
     *         schema:
     *           type: integer
     *           minimum: 0
     *       - in: query
     *         name: from
     *         description: Only expenses on or after this date
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: to
     *         description: Only expenses on or before this date
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: sort
     *         description: Field to sort by. Prefix with a minus sign for descending.
     *         schema:
     *           type: string
     *           enum: [date, -date, amount, -amount]
     *           default: -date
     *       - in: query
     *         name: fields
     *         description: Comma separated list of fields to return (projection)
     *         schema:
     *           type: string
     *         example: description,amount
     *       - $ref: '#/components/parameters/Page'
     *       - $ref: '#/components/parameters/Limit'
     *     responses:
     *       200:
     *         description: A page of expenses
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Expense'
     *                 meta:
     *                   $ref: '#/components/schemas/ListMeta'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
    getExpenses = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = res.locals.query as ExpenseQuery;
            const { expenses, total } = await expenseService.getExpenses(req.params.tripId as string, query);
            res.status(200).json(listResponse(expenses, query.page, query.limit, total));
        } catch (error) {
            handleError(res, error, 'Error fetching expenses');
        }
    };

    /**
     * @openapi
     * /trips/{tripId}/expenses/{expenseId}:
     *   get:
     *     summary: Get one expense
     *     tags:
     *       - Expenses
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ExpenseId'
     *     responses:
     *       200:
     *         description: The expense
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Expense'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
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

    /**
     * @openapi
     * /trips/{tripId}/expenses:
     *   post:
     *     summary: Add an expense to a trip
     *     description: >
     *       If splits is left out, the amount is divided equally between every participant of the trip
     *       (any leftover cents go one each to the first participants).
     *       Business rules (422) - the payer and everyone in splits must be participants of this trip,
     *       and the date must fall within the trip dates.
     *     tags:
     *       - Expenses
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ExpenseInput'
     *     responses:
     *       201:
     *         description: Expense created
     *         headers:
     *           Location:
     *             schema:
     *               type: string
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Expense'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       422:
     *         $ref: '#/components/responses/Unprocessable'
     *       500:
     *         description: Internal server error
     */
    createExpense = async (req: Request, res: Response): Promise<void> => {
        try {
            const tripId = req.params.tripId as string;
            const newExpense = await expenseService.createExpense(tripId, req.body);
            res.status(201).location(`/api/v1/trips/${tripId}/expenses/${newExpense._id}`).json(newExpense);
        } catch (error) {
            handleError(res, error, 'Error creating expense');
        }
    };

    /**
     * @openapi
     * /trips/{tripId}/expenses/{expenseId}:
     *   put:
     *     summary: Replace an expense
     *     tags:
     *       - Expenses
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ExpenseId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ExpenseInput'
     *     responses:
     *       200:
     *         description: The updated expense
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Expense'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       422:
     *         $ref: '#/components/responses/Unprocessable'
     *       500:
     *         description: Internal server error
     */
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

    /**
     * @openapi
     * /trips/{tripId}/expenses/{expenseId}:
     *   delete:
     *     summary: Delete an expense
     *     tags:
     *       - Expenses
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ExpenseId'
     *     responses:
     *       204:
     *         description: Expense deleted (no content)
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
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