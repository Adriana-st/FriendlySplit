import { Response } from 'express';

/**
 * An error that carries an HTTP status code.
 * Services throw these when a business rule is broken, and the controllers turn them into responses.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** 404 - the resource does not exist. */
export const notFound = (what: string): HttpError => new HttpError(404, `${what} not found`);

/** 409 - the request is valid but clashes with the current data (e.g. duplicate email). */
export const conflict = (message: string): HttpError => new HttpError(409, message);

/** 422 - the JSON is well formed but breaks a business rule that depends on other data. */
export const unprocessable = (message: string, details?: unknown): HttpError =>
  new HttpError(422, message, details);

/**
 * Used in the catch block of every controller method.
 * Errors we threw on purpose keep their status code; anything else is a 500 with a safe message
 * (stack traces and database details are logged on the server, never sent to the client).
 */
export const handleError = (res: Response, error: unknown, message: string): void => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details !== undefined && { errors: error.details }),
    });
    return;
  }

  // MongoDB duplicate key (a unique index was broken)
  if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
    res.status(409).json({ message: 'That value already exists' });
    return;
  }

  console.error(message, error);
  res.status(500).json({ message });
};