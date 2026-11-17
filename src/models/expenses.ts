import { Schema, Types, model } from 'mongoose';
import { z } from 'zod';

// A MongoDB id: 24 characters, each 0-9 or a-f
const objectIdZSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24 character id');

// The only categories an expense can have
export const EXPENSE_CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'] as const;


// One person's share of an expense, in whole cents. 
export interface ISplit {
  participant: Types.ObjectId;
  share: number;
}

// What an expense looks like in the database
export interface IExpense {
  trip: Types.ObjectId;
  paidBy: Types.ObjectId;
  description: string;
  amount: number;
  category: string;
  date: Date;
  splits: ISplit[];
}

// One person's share, as the client sends it (ids arrive as text)
export interface SplitInput {
  participant: string;
  share: number;
}

// What the client sends when creating or updating an expense. 
// "splits" is optional - if it is left out, the amount is split equally between everyone on the trip.
export interface ExpenseInput {
  paidBy: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  splits?: SplitInput[];
}

const splitSchema = new Schema<ISplit>(
  {
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    share: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'share must be a whole number of cents' },
    },
  },
  { _id: false } // a split is part of an expense, it does not need its own id
);

/**
 * An Expense belongs to a Trip, is paid by one Participant and is divided between several.
 * Money is always stored as integer cents to avoid floating point rounding errors.
 */
const expenseSchema = new Schema<IExpense>(
  {
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    description: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be a whole number of cents' },
    },
    // [...list] makes a normal copy of the list, because Mongoose does not accept an "as const" list
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    date: { type: Date, required: true },
    splits: { type: [splitSchema], required: true },
  },
  { timestamps: true, versionKey: false }
);

// Listing the expenses of a trip, newest first
expenseSchema.index({ trip: 1, date: -1 });

export const ExpenseModel = model<IExpense>('Expense', expenseSchema);

/**
 * @openapi
 * components:
 *   schemas:
 *     Category:
 *       type: string
 *       enum: [food, transport, accommodation, activities, other]
 *     Split:
 *       type: object
 *       required:
 *         - participant
 *         - share
 *       additionalProperties: false
 *       properties:
 *         participant:
 *           $ref: '#/components/schemas/ObjectId'
 *         share:
 *           type: integer
 *           minimum: 0
 *           description: This person's share in cents
 *           example: 2000
 *     ExpenseInput:
 *       type: object
 *       required:
 *         - paidBy
 *         - description
 *         - amount
 *         - category
 *         - date
 *       properties:
 *         paidBy:
 *           $ref: '#/components/schemas/ObjectId'
 *         description:
 *           type: string
 *           maxLength: 120
 *           example: Seafood dinner
 *         amount:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000000
 *           description: Total in cents
 *           example: 6000
 *         category:
 *           $ref: '#/components/schemas/Category'
 *         date:
 *           type: string
 *           format: date
 *           description: Must fall within the trip dates
 *           example: '2026-07-03'
 *         splits:
 *           type: array
 *           minItems: 1
 *           maxItems: 50
 *           description: Optional. Each participant may appear once and the shares must add up exactly to amount. When left out, the amount is split equally between all participants of the trip.
 *           items:
 *             $ref: '#/components/schemas/Split'
 *     Expense:
 *       allOf:
 *         - type: object
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             trip:
 *               $ref: '#/components/schemas/ObjectId'
 *         - $ref: '#/components/schemas/ExpenseInput'
 *         - type: object
 *           required:
 *             - splits
 *           properties:
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

// Validation for one share in "splits"
const splitZSchema = z.strictObject({
  participant: objectIdZSchema,
  share: z.number().int('Share must be a whole number of cents').min(0),
});

// Adds up all the shares in a list of splits
const totalOfShares = (splits: SplitInput[]): number => {
  let total = 0;
  for (const split of splits) {
    total = total + split.share;
  }
  return total;
};

// True if nobody appears twice in the list.
// A Set only keeps unique values, so if the Set is smaller than the list, someone was listed twice.
const noOneListedTwice = (splits: SplitInput[]): boolean => {
  const ids = splits.map((split) => split.participant);
  return new Set(ids).size === ids.length;
};

// Validation for the body of POST and PUT on /trips/:tripId/expenses
export const expenseZSchema = z
  .object({
    paidBy: objectIdZSchema,
    description: z.string().trim().min(1, 'Description is required').max(120),
    amount: z
      .number('Amount must be a number of cents')
      .int('Amount must be a whole number of cents')
      .positive('Amount must be greater than zero')
      .max(100_000_000, 'Amount is too large'),
    category: z.enum(EXPENSE_CATEGORIES),
    date: z.iso.date('Must be a date like 2026-07-03'),
    splits: z.array(splitZSchema).min(1).max(50).optional(),
  })
  // The splits must add up to the amount and each participant can only appear once
  .refine((expense) => !expense.splits || totalOfShares(expense.splits) === expense.amount, {
    message: 'Shares must add up to exactly the amount',
    path: ['splits'],
  })
  .refine((expense) => !expense.splits || noOneListedTwice(expense.splits), {
    message: 'Each participant can only appear once in splits',
    path: ['splits'],
  });

export const EXPENSE_SORT_FIELDS = ['date', '-date', 'amount', '-amount'] as const;
// Fields the client is allowed to ask for with ?fields=description,amount. If the client asks for a field not in this list, it is rejected.
export const EXPENSE_FIELDS = ['trip', 'paidBy', 'description', 'amount', 'category', 'date', 'splits', 'createdAt', 'updatedAt'];

// Query string for GET /trips/:tripId/expenses. 
export const expenseQueryZSchema = z
  .strictObject({
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    paidBy: objectIdZSchema.optional(),
    search: z.string().trim().min(1).max(60).optional(), // partial match on the description
    minAmount: z.coerce.number().int().min(0).optional(),
    maxAmount: z.coerce.number().int().min(0).optional(),
    from: z.iso.date().optional(), // expenses on or after this date
    to: z.iso.date().optional(), // expenses on or before this date
    sort: z.enum(EXPENSE_SORT_FIELDS).default('-date'),
    fields: z
      .string()
      .refine((value) => value.split(',').every((field) => EXPENSE_FIELDS.includes(field)), 'fields can only contain: ' + EXPENSE_FIELDS.join(', '))  
      .optional(),
    //Paging. Query strings are always text, so coerce turns "2" into the number 2
    page: z.coerce.number().int().min(1).default(1),    // page number, starting at 1
    limit: z.coerce.number().int().min(1).max(100).default(20), // number of expenses per page
  })
  .refine((q) => q.minAmount === undefined || q.maxAmount === undefined || q.minAmount <= q.maxAmount, {
    message: 'minAmount must not be greater than maxAmount',
    path: ['minAmount'],
  });
export type ExpenseQuery = z.infer<typeof expenseQueryZSchema>;