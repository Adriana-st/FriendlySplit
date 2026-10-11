import { Schema, model } from 'mongoose';

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