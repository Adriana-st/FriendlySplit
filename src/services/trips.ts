import { HydratedDocument } from 'mongoose';
import { ITrip, TripModel } from '../models/trips';

export class TripService {

  async getAllTrips(): Promise<ITrip[]> {
    return await TripModel.find().lean();
  }

  async getTripById(id: string): Promise<ITrip | null> {
    return await TripModel.findById(id).lean();
  }

  async createTrip(tripData: ITrip): Promise<HydratedDocument<ITrip>> {
    const trip = new TripModel(tripData);
    return await trip.save();
  }

  async updateTrip(id: string, tripData: ITrip): Promise<ITrip | null> {
    return await TripModel.findByIdAndUpdate(id, tripData, { returnDocument: 'after', runValidators: true }).lean();
  }

  async deleteTrip(id: string): Promise<ITrip | null> {
    return await TripModel.findByIdAndDelete(id).lean();
  }

}