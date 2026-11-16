import { Schema, Types, model } from 'mongoose';
import { z } from 'zod';
import { fieldsZSchema, isoDateZSchema, objectIdZSchema, paginationZShape } from './common';

export const EXPENSE_CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** One person's share of an expense, in whole cents. */
export interface ISplit {
  participant: Types.ObjectId;
  share: number;
}

export interface IExpense {
  trip: Types.ObjectId;
  paidBy: Types.ObjectId;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  splits: ISplit[];
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
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    date: { type: Date, required: true },
    splits: { type: [splitSchema], required: true },
  },
  { timestamps: true, versionKey: false }
);

// Listing the expenses of a trip, newest first, is the most common query
expenseSchema.index({ trip: 1, date: -1 });

export const ExpenseModel = model<IExpense>('Expense', expenseSchema);

const splitZSchema = z.strictObject({
  participant: objectIdZSchema,
  share: z.number().int('Share must be a whole number of cents').min(0),
});

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
 *       additionalProperties: false
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

/**
 * Body for POST and PUT on /trips/:tripId/expenses.
 * "splits" is optional - when it is left out the amount is divided equally between everyone on the trip.
 */
export const expenseZSchema = z
  .strictObject({
    paidBy: objectIdZSchema,
    description: z.string().trim().min(1, 'Description is required').max(120),
    amount: z
      .number('Amount must be a number of cents')
      .int('Amount must be a whole number of cents')
      .positive('Amount must be greater than zero')
      .max(100_000_000, 'Amount is too large'),
    category: z.enum(EXPENSE_CATEGORIES),
    date: isoDateZSchema,
    splits: z.array(splitZSchema).min(1).max(50).optional(),
  })
  .superRefine((expense, ctx) => {
    if (!expense.splits) return;

    const total = expense.splits.reduce((sum, split) => sum + split.share, 0);
    if (total !== expense.amount) {
      ctx.addIssue({
        code: 'custom',
        path: ['splits'],
        message: `Shares must add up to the amount (${expense.amount}) but add up to ${total}`,
      });
    }

    const ids = expense.splits.map((split) => split.participant);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['splits'],
        message: 'Each participant can only appear once in splits',
      });
    }
  });
export type ExpenseInput = z.infer<typeof expenseZSchema>;

export const EXPENSE_SORT_FIELDS = ['date', '-date', 'amount', '-amount'] as const;
export const EXPENSE_FIELDS = ['trip', 'paidBy', 'description', 'amount', 'category', 'date', 'splits', 'createdAt', 'updatedAt'] as const;

/** Query string for GET /trips/:tripId/expenses. */
export const expenseQueryZSchema = z
  .strictObject({
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    paidBy: objectIdZSchema.optional(),
    search: z.string().trim().min(1).max(60).optional(), // partial match on the description
    minAmount: z.coerce.number().int().min(0).optional(),
    maxAmount: z.coerce.number().int().min(0).optional(),
    from: isoDateZSchema.optional(), // expenses on or after this date
    to: isoDateZSchema.optional(), // expenses on or before this date
    sort: z.enum(EXPENSE_SORT_FIELDS).default('-date'),
    fields: fieldsZSchema(EXPENSE_FIELDS),
    ...paginationZShape,
  })
  .refine((q) => q.minAmount === undefined || q.maxAmount === undefined || q.minAmount <= q.maxAmount, {
    message: 'minAmount must not be greater than maxAmount',
    path: ['minAmount'],
  });
export type ExpenseQuery = z.infer<typeof expenseQueryZSchema>;