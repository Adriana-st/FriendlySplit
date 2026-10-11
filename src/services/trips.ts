import { HydratedDocument } from 'mongoose';
import { ITrip, TripInput, TripModel, TripQuery } from '../models/trips';
import { buildSelect, buildSort, escapeRegex, paginate, toDate } from '../utils/helpers';

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

  async updateTrip(id: string, tripData: TripInput): Promise<ITrip | null> {
    return await TripModel.findByIdAndUpdate(
      id,
      { ...tripData, startDate: toDate(tripData.startDate), endDate: toDate(tripData.endDate) },
      { returnDocument: 'after', runValidators: true }
    ).lean();
  }

  async deleteTrip(id: string): Promise<ITrip | null> {
    return await TripModel.findByIdAndDelete(id).lean();
  }

}