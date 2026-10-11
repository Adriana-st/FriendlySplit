import { z } from 'zod';

/** A MongoDB ObjectId as a 24 character hex string. */
export const objectIdZSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24 character id');

/** A calendar date written as YYYY-MM-DD. */
export const isoDateZSchema = z.iso.date('Must be a valid date in the format YYYY-MM-DD');

/** Path parameters used by the routes. */
export const tripParamsZSchema = z.object({ tripId: objectIdZSchema });

/** ?page=1&limit=20 - query strings arrive as text, so they are coerced to numbers. */
export const paginationZShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

/**
 * ?fields=name,destination - lets the client choose which fields come back (a projection).
 * Only fields in the allow-list are accepted.
 */
export const fieldsZSchema = <T extends readonly [string, ...string[]]>(allowed: T) =>
  z
    .string()
    .transform((value) => value.split(',').map((field) => field.trim()))
    .pipe(z.array(z.enum(allowed)).min(1))
    .optional();
