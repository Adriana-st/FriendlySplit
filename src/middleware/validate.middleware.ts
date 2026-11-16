import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/** Turns Zod issues into a short list the client can read: which field, and what was wrong. */
const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

/** Validates the request body. On success req.body is replaced by the cleaned data. */
export const validate = (schema: z.ZodType) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  const validation = schema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: formatIssues(validation.error)
    });
    return;
  }

  req.body = validation.data;

  next();
};

/** Validates the ids in the URL (/trips/:tripId/...). */
export const validateParams = (schema: z.ZodType) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  const validation = schema.safeParse(req.params);

  if (!validation.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: formatIssues(validation.error)
    });
    return;
  }

  next();
};

/**
 * Validates the query string (?sort=name&page=2).
 * Express 5 makes req.query read-only, so the cleaned data is stored in res.locals.query.
 */
export const validateQuery = (schema: z.ZodType) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  const validation = schema.safeParse(req.query);

  if (!validation.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: formatIssues(validation.error)
    });
    return;
  }

  res.locals.query = validation.data;

  next();
};