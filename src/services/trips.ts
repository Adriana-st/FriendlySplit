import { HydratedDocument } from 'mongoose';
import { ITrip, TripInput, TripModel } from '../models/trips';
import { toDate } from '../utils/helpers';
export class TripService {

  async getAllTrips(): Promise<ITrip[]> {
    return await TripModel.find().lean();
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