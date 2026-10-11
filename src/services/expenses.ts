import { ExpenseInput, ExpenseModel, ExpenseQuery } from '../models/expenses';
import { ParticipantModel } from '../models/participants';
import { TripService } from './trips';
import { unprocessable } from '../utils/errors';
import { buildSelect, buildSort, dayText, escapeRegex, paginate, toDate } from '../utils/helpers';

const tripService = new TripService();

export interface Split {
  participant: string;
  share: number;
}

/**
 * Divides an amount (in cents) equally between participants.
 *
 * Cents cannot be split, so any remainder is handed out one cent at a time to the first
 * participants in the list. Example: 1000 cents between 3 people -> 334, 333, 333.
 * The shares always add up to exactly the original amount.
 */
export function equalSplit(amount: number, participantIds: string[]): Split[] {
  if (participantIds.length === 0) return [];

  const base = Math.floor(amount / participantIds.length);
  const remainder = amount - base * participantIds.length;

  return participantIds.map((participant, index) => ({
    participant,
    share: base + (index < remainder ? 1 : 0),
  }));
}

export class ExpenseService {

  /**
   * Rules that need other data from the database, so Zod alone cannot check them:
   *  - the payer and everyone in the split must be participants of THIS trip
   *  - the expense date must fall inside the trip dates
   * When "splits" was not supplied, the amount is split equally between all participants.
   * Returns the data ready to be saved.
   */
  private async applyBusinessRules(
    trip: { startDate: Date; endDate: Date },
    tripId: string,
    expenseData: ExpenseInput
  ) {
    const participants = await ParticipantModel.find({ trip: tripId }).select('_id').sort({ createdAt: 1, _id: 1 }).lean();
    const participantIds = participants.map((p) => String(p._id));
    const known = new Set(participantIds);

    if (!known.has(expenseData.paidBy)) {
      throw unprocessable('paidBy must be a participant of this trip');
    }

    const date = toDate(expenseData.date);
    if (date < trip.startDate || date > trip.endDate) {
      throw unprocessable(
        `Expense date must fall within the trip dates (${dayText(trip.startDate)} to ${dayText(trip.endDate)})`
      );
    }

    let splits = expenseData.splits;
    if (splits) {
      const outsiders = splits.filter((split) => !known.has(split.participant)).map((split) => split.participant);
      if (outsiders.length > 0) {
        throw unprocessable('Everyone in splits must be a participant of this trip', outsiders);
      }
    } else {
      splits = equalSplit(expenseData.amount, participantIds);
    }

    return { ...expenseData, date, splits };
  }

  async getExpenses(tripId: string, query: ExpenseQuery) {
    await tripService.requireTrip(tripId);

    const filter: Record<string, any> = { trip: tripId };
    if (query.category) filter.category = query.category;
    if (query.paidBy) filter.paidBy = query.paidBy;
    if (query.search) filter.description = { $regex: escapeRegex(query.search), $options: 'i' };

    const amountRange: Record<string, number> = {};
    if (query.minAmount !== undefined) amountRange.$gte = query.minAmount;
    if (query.maxAmount !== undefined) amountRange.$lte = query.maxAmount;
    if (Object.keys(amountRange).length > 0) filter.amount = amountRange;

    const dateRange: Record<string, Date> = {};
    if (query.from) dateRange.$gte = toDate(query.from);
    if (query.to) dateRange.$lte = toDate(query.to);
    if (Object.keys(dateRange).length > 0) filter.date = dateRange;

    const { skip, limit } = paginate(query.page, query.limit);

    const [expenses, total] = await Promise.all([
      ExpenseModel.find(filter)
        .select(buildSelect(query.fields))
        .sort({ ...buildSort(query.sort), _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExpenseModel.countDocuments(filter),
    ]);

    return { expenses, total };
  }

  async getExpenseById(tripId: string, id: string) {
    await tripService.requireTrip(tripId);
    return await ExpenseModel.findOne({ _id: id, trip: tripId }).lean();
  }

  async createExpense(tripId: string, expenseData: ExpenseInput) {
    const trip = await tripService.requireTrip(tripId);
    const data = await this.applyBusinessRules(trip, tripId, expenseData);

    const expense = new ExpenseModel({ ...data, trip: tripId });
    return await expense.save();
  }

  async updateExpense(tripId: string, id: string, expenseData: ExpenseInput) {
    const trip = await tripService.requireTrip(tripId);

    const existing = await ExpenseModel.findOne({ _id: id, trip: tripId }).lean();
    if (!existing) return null;

    const data = await this.applyBusinessRules(trip, tripId, expenseData);
    return await ExpenseModel.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }).lean();
  }

  async deleteExpense(tripId: string, id: string) {
    await tripService.requireTrip(tripId);
    return await ExpenseModel.findOneAndDelete({ _id: id, trip: tripId }).lean();
  }
}