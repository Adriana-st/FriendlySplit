import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { fieldsZSchema, isoDateZSchema, paginationZShape } from './common';

export interface ITrip {
  name: string;
  destination?: string;
  currency: string;
  startDate: Date;
  endDate: Date;
}

// A Trip is the top-level entity. Participants and Expenses both belong to one Trip.
const tripSchema = new Schema<ITrip>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    destination: { type: String, trim: true, maxlength: 80 },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/ },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const TripModel = model<ITrip>('Trip', tripSchema);

/**
 * @openapi
 * components:
 *   schemas:
 *     TripInput:
 *       type: object
 *       required:
 *         - name
 *         - currency
 *         - startDate
 *         - endDate
 *       additionalProperties: false
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 60
 *           example: Lisbon City Break
 *         destination:
 *           type: string
 *           maxLength: 80
 *           example: Lisbon
 *         currency:
 *           type: string
 *           pattern: '^[A-Za-z]{3}$'
 *           description: Three letter currency code (stored in upper case)
 *           example: EUR
 *         startDate:
 *           type: string
 *           format: date
 *           example: '2026-07-01'
 *         endDate:
 *           type: string
 *           format: date
 *           description: Must not be before startDate
 *           example: '2026-07-08'
 *     Trip:
 *       allOf:
 *         - type: object
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *         - $ref: '#/components/schemas/TripInput'
 *         - type: object
 *           properties:
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

export const tripZSchema = z
  .strictObject({
    name: z.string().trim().min(3, 'Name must be at least 3 characters').max(60),
    destination: z.string().trim().min(1).max(80).optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3 letter code such as EUR'),
    startDate: isoDateZSchema,
    endDate: isoDateZSchema,
  })
  .refine((trip) => trip.endDate >= trip.startDate, {
    message: 'endDate must not be before startDate',
    path: ['endDate'],
  });
export type TripInput = z.infer<typeof tripZSchema>;

export const TRIP_SORT_FIELDS = ['startDate', '-startDate', 'name', '-name', 'createdAt', '-createdAt'] as const;
export const TRIP_FIELDS = ['name', 'destination', 'currency', 'startDate', 'endDate', 'createdAt', 'updatedAt'] as const;

/** Query string for GET /trips. strictObject rejects any parameter that is not listed. */
export const tripQueryZSchema = z.strictObject({
  destination: z.string().trim().min(1).max(80).optional(), // partial, case-insensitive match
  currency: z.string().trim().length(3).toUpperCase().optional(),
  startsAfter: isoDateZSchema.optional(), // trips starting on or after this date
  startsBefore: isoDateZSchema.optional(), // trips starting on or before this date
  sort: z.enum(TRIP_SORT_FIELDS).default('-startDate'),
  fields: fieldsZSchema(TRIP_FIELDS),
  ...paginationZShape,
});
export type TripQuery = z.infer<typeof tripQueryZSchema>;