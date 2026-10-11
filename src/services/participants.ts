import { ParticipantInput, ParticipantModel, ParticipantQuery } from '../models/participants';
import { TripService } from './trips';
import { conflict } from '../utils/errors';
import { buildSelect, buildSort, escapeRegex, paginate } from '../utils/helpers';
import { ExpenseModel } from '../models/expenses';

const tripService = new TripService();

export class ParticipantService {

  async getParticipants(tripId: string, query: ParticipantQuery) {
    await tripService.requireTrip(tripId);

    const filter: Record<string, any> = { trip: tripId };
    if (query.name) {
      filter.name = { $regex: escapeRegex(query.name), $options: 'i' };
    }

    const { skip, limit } = paginate(query.page, query.limit);

    const [participants, total] = await Promise.all([
      ParticipantModel.find(filter)
        .select(buildSelect(query.fields))
        .sort({ ...buildSort(query.sort), _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ParticipantModel.countDocuments(filter),
    ]);

    return { participants, total };
  }

  async getParticipantById(tripId: string, id: string) {
    await tripService.requireTrip(tripId);
    return await ParticipantModel.findOne({ _id: id, trip: tripId }).lean();
  }

  async createParticipant(tripId: string, data: ParticipantInput) {
    await tripService.requireTrip(tripId);

    if (await ParticipantModel.exists({ trip: tripId, email: data.email })) {
      throw conflict('A participant with that email is already on this trip');
    }

    const participant = new ParticipantModel({ ...data, trip: tripId });
    return await participant.save();
  }

  async updateParticipant(tripId: string, id: string, data: ParticipantInput) {
    await tripService.requireTrip(tripId);

    const existing = await ParticipantModel.findOne({ _id: id, trip: tripId }).lean();
    if (!existing) return null;

    const emailTaken = await ParticipantModel.exists({ trip: tripId, email: data.email, _id: { $ne: id } });
    if (emailTaken) {
      throw conflict('A participant with that email is already on this trip');
    }

    return await ParticipantModel.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }).lean();
  }

  async deleteParticipant(tripId: string, id: string) {
    await tripService.requireTrip(tripId);

    const existing = await ParticipantModel.findOne({ _id: id, trip: tripId }).lean();
    if (!existing) return null;

    // Business rule: someone who paid for, or shares in, an expense cannot be removed
    const inUse = await ExpenseModel.exists({
      trip: tripId,
      $or: [{ paidBy: id }, { 'splits.participant': id }],
    });
    if (inUse) {
      throw conflict('This participant is used by existing expenses. Delete or change those expenses first');
    }

    return await ParticipantModel.findByIdAndDelete(id).lean();
  }
}