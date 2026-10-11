import { HydratedDocument } from 'mongoose';
import { ITrip, TripInput, TripModel, TripQuery } from '../models/trips';
import { buildSelect, buildSort, escapeRegex, paginate, toDate } from '../utils/helpers';
import { ParticipantModel } from '../models/participants';
import { ExpenseModel } from '../models/expenses';
import { notFound, unprocessable } from '../utils/errors';

export class TripService {

  async getAllTrips(query: TripQuery) {
    const filter: Record<string, any> = {};

    if (query.destination) {
      filter.destination = { $regex: escapeRegex(query.destination), $options: 'i' };
    }
    if (query.currency) {
      filter.currency = query.currency;
    }

    const startRange: Record<string, Date> = {};
    if (query.startsAfter) startRange.$gte = toDate(query.startsAfter);
    if (query.startsBefore) startRange.$lte = toDate(query.startsBefore);
    if (Object.keys(startRange).length > 0) {
      filter.startDate = startRange;
    }

    const { skip, limit } = paginate(query.page, query.limit);

    const [trips, total] = await Promise.all([
      TripModel.find(filter)
        .select(buildSelect(query.fields))
        .sort({ ...buildSort(query.sort), _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TripModel.countDocuments(filter),
    ]);

    return { trips, total };
  }

  async getTripById(id: string): Promise<ITrip | null> {
    return await TripModel.findById(id).lean();
  }

    async createTrip(tripData: TripInput): Promise<HydratedDocument<ITrip>> {
    const trip = new TripModel({
      ...tripData,
      startDate: toDate(tripData.startDate),
      endDate: toDate(tripData.endDate),
    });
    return await trip.save();
  }

  async updateTrip(id: string, tripData: TripInput) {
    const existing = await TripModel.findById(id).lean();
    if (!existing) return null;

    const startDate = toDate(tripData.startDate);
    const endDate = toDate(tripData.endDate);

    // Business rule: the new dates must still contain every existing expense
    const outside = await ExpenseModel.exists({
      trip: id,
      $or: [{ date: { $lt: startDate } }, { date: { $gt: endDate } }],
    });
    if (outside) {
      throw unprocessable('The new trip dates would leave some existing expenses outside the trip');
    }

    return await TripModel.findByIdAndUpdate(
      id,
      { ...tripData, startDate, endDate },
      { returnDocument: 'after', runValidators: true }
    ).lean();
  }

  /** Deletes the trip together with its participants and expenses. */
  async deleteTrip(id: string) {
    const existing = await TripModel.findById(id).lean();
    if (!existing) return null;

    await ExpenseModel.deleteMany({ trip: id });
    await ParticipantModel.deleteMany({ trip: id });
    await TripModel.findByIdAndDelete(id);

    return existing;
  }

    /** Loads a trip or throws a 404. Used by every nested resource (participants, expenses, balances). */
  async requireTrip(id: string) {
    const trip = await TripModel.findById(id).lean();
    if (!trip) throw notFound('Trip');
    return trip;
  }

}