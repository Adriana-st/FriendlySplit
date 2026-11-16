import { Request, Response, NextFunction } from 'express';

/** Any request that did not match a route ends up here -> 404. */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} does not exist` });
};

/**
 * Catches errors that happen before a controller runs, mostly from express.json():
 * a body that is not valid JSON (400) or a body that is too large (413).
 * Anything else is a 500 with a safe message - stack traces are never sent to the client.
 */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const status = (err as { status?: number }).status;

  if (status === 413) {
    res.status(413).json({ message: 'Request body is too large' });
    return;
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ message: 'Request body is not valid JSON' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};