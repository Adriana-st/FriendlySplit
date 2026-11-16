import { Request, Response } from 'express';
import { BalanceService } from '../services/balances';
import { handleError } from '../utils/errors';

const balanceService = new BalanceService();

export class BalanceController {

    /**
     * @openapi
     * /trips/{tripId}/balances:
     *   get:
     *     summary: Who owes whom on this trip
     *     description: >
     *       Calculated from the expenses (not stored). For each participant - how much they paid,
     *       their share of all expenses, and the difference (net). A positive net means they are owed money.
     *       The settlements list is a short set of payments that settles everyone up.
     *     tags:
     *       - Balances
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *     responses:
     *       200:
     *         description: The balances
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Balances'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
    getBalances = async (req: Request, res: Response): Promise<void> => {
        try {
            const balances = await balanceService.getBalances(req.params.tripId as string);
            res.status(200).json(balances);
        } catch (error) {
            handleError(res, error, 'Error calculating balances');
        }
    };

}