import { Schema, Types, model } from 'mongoose';
import { z } from 'zod';
import { fieldsZSchema, paginationZShape } from './common';

export interface IParticipant {
  trip: Types.ObjectId;
  name: string;
  email: string;
}

/**
 * A Participant is a person on one Trip.
 * At the moment it stores just a name and email; later it can reference a real user account.
 */
const participantSchema = new Schema<IParticipant>(
  {
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
  },
  { timestamps: true, versionKey: false }
);

// The same email can only appear once per trip (but can appear on different trips).
participantSchema.index({ trip: 1, email: 1 }, { unique: true });

export const ParticipantModel = model<IParticipant>('Participant', participantSchema);

/** Body for POST and PUT on /trips/:tripId/participants. */
export const participantZSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required').max(60),
  email: z.string().trim().toLowerCase().email('Must be a valid email address').max(100),
});
export type ParticipantInput = z.infer<typeof participantZSchema>;

export const PARTICIPANT_SORT_FIELDS = ['name', '-name', 'createdAt', '-createdAt'] as const;
export const PARTICIPANT_FIELDS = ['trip', 'name', 'email', 'createdAt', 'updatedAt'] as const;

export const participantQueryZSchema = z.strictObject({
  name: z.string().trim().min(1).max(60).optional(), // partial, case-insensitive match
  sort: z.enum(PARTICIPANT_SORT_FIELDS).default('name'),
  fields: fieldsZSchema(PARTICIPANT_FIELDS),
  ...paginationZShape,
});
export type ParticipantQuery = z.infer<typeof participantQueryZSchema>;