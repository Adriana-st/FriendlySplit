import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { isoDateZSchema } from './common';

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