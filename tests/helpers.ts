import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";

/** Empties every collection - called before each test so tests cannot affect each other. */
export const clearDb = async (): Promise<void> => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

/** A valid ObjectId that does not exist in the database. */
export const MISSING_ID = '64b7f0f0f0f0f0f0f0f0f0f0';

// ---------- factories: create data through the real API ----------

export const tripData = (overrides: Record<string, unknown> = {}) => ({
    name: 'Lisbon City Break',
    destination: 'Lisbon',
    currency: 'EUR',
    startDate: '2026-07-01',
    endDate: '2026-07-08',
    ...overrides,
});

export const makeTrip = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app).post('/api/v1/trips').send(tripData(overrides));
    if (res.status !== 201) throw new Error(`makeTrip failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body as { _id: string; name: string; startDate: string; endDate: string };
};

export const makeParticipant = async (tripId: string, name = 'Adri', email?: string) => {
    const res = await request(app)
        .post(`/api/v1/trips/${tripId}/participants`)
        .send({ name, email: email ?? `${name.toLowerCase()}@example.com` });
    if (res.status !== 201) throw new Error(`makeParticipant failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body as { _id: string; name: string; email: string };
};

/** A trip with three participants - the starting point for most expense tests. */
export const makeTripWithPeople = async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');
    const maria = await makeParticipant(trip._id, 'Maria');
    const tom = await makeParticipant(trip._id, 'Tom');
    return { trip, adri, maria, tom };
};

export const expenseData = (paidBy: string, overrides: Record<string, unknown> = {}) => ({
    paidBy,
    description: 'Dinner at the harbour',
    amount: 6000,
    category: 'food',
    date: '2026-07-02',
    ...overrides,
});

export const makeExpense = async (tripId: string, paidBy: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app).post(`/api/v1/trips/${tripId}/expenses`).send(expenseData(paidBy, overrides));
    if (res.status !== 201) throw new Error(`makeExpense failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body as {
        _id: string;
        amount: number;
        splits: { participant: string; share: number }[];
    };
};