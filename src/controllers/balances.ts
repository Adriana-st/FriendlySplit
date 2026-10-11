import { Request, Response } from 'express';
import { BalanceService } from '../services/balances';
import { handleError } from '../utils/errors';

const balanceService = new BalanceService();

export class BalanceController {

  getBalances = async (req: Request, res: Response): Promise<void> => {
    try {
      const balances = await balanceService.getBalances(req.params.tripId as string);
      res.status(200).json(balances);
    } catch (error) {
      handleError(res, error, 'Error calculating balances');
    }
  };

}