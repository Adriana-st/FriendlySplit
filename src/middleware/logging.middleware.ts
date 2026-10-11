import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, _res: Response, next: NextFunction): void => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
};