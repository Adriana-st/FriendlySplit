import { Schema, Types, model } from 'mongoose';
import { z } from 'zod';

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

/**
 * @openapi
 * components:
 *   schemas:
 *     ParticipantInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       additionalProperties: false
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 60
 *           example: Adri
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           description: Must be unique within the trip (stored in lower case)
 *           example: adri@example.com
 *     Participant:
 *       allOf:
 *         - type: object
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             trip:
 *               $ref: '#/components/schemas/ObjectId'
 *         - $ref: '#/components/schemas/ParticipantInput'
 *         - type: object
 *           properties:
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

/** Body for POST and PUT on /trips/:tripId/participants. */
export const participantZSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required').max(60),
  email: z.string().trim().toLowerCase().email('Must be a valid email address').max(100),
});
export type ParticipantInput = z.infer<typeof participantZSchema>;

export const PARTICIPANT_SORT_FIELDS = ['name', '-name', 'createdAt', '-createdAt'] as const;
// Fields the client is allowed to ask for with ?fields=name,email. If the client asks for a field not in this list, it is rejected.
export const PARTICIPANT_FIELDS = ['trip', 'name', 'email', 'createdAt', 'updatedAt'];

export const participantQueryZSchema = z.strictObject({
  name: z.string().trim().min(1).max(60).optional(), 
  sort: z.enum(PARTICIPANT_SORT_FIELDS).default('name'),
  fields: z
    .string()
    .refine((value) => value.split(',').every((field) => PARTICIPANT_FIELDS.includes(field)), 'fields can only contain: ' + PARTICIPANT_FIELDS.join(', '))
    .optional(),
  //Paging. Query strings are always text, so coerce turns "2" into the number 2
  page: z.coerce.number().int().min(1).default(1),    // page number, starting at 1
  limit: z.coerce.number().int().min(1).max(100).default(20), // number of participants per page
});
export type ParticipantQuery = z.infer<typeof participantQueryZSchema>;