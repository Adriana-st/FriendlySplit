import { z } from 'zod';

/** A MongoDB ObjectId as a 24 character hex string. */
export const objectIdZSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24 character id');

/** A calendar date written as YYYY-MM-DD. */
export const isoDateZSchema = z.iso.date('Must be a valid date in the format YYYY-MM-DD');

/** Path parameters used by the routes. */
export const tripParamsZSchema = z.object({ tripId: objectIdZSchema });