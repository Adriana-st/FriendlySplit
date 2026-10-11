import request from "supertest";
import { app } from "../../src/app";
import {
  MISSING_ID,
  clearDb,
  makeExpense,
  makeTrip,
  makeTripWithPeople,
} from '../helpers';

beforeEach(clearDb);

describe('GET /api/v1/trips/:tripId/balances', () => {
  it('shows zero balances for a trip with no expenses', async () => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/balances`);

    expect(res.status).toBe(200);
    expect(res.body.totalSpent).toBe(0);
    expect(res.body.currency).toBe('EUR');
    expect(res.body.balances).toHaveLength(3);
    expect(res.body.settlements).toEqual([]);
  });

  it('works out who owes whom', async () => {
    const { trip, adri, maria, tom } = await makeTripWithPeople();
    // Adri pays 90.00 for all three (30.00 each)
    await makeExpense(trip._id, adri._id, { amount: 9000 });
    // Maria pays 30.00 for all three (10.00 each)
    await makeExpense(trip._id, maria._id, { amount: 3000, description: 'Taxi', category: 'transport' });

    const res = await request(app).get(`/api/v1/trips/${trip._id}/balances`);
    expect(res.status).toBe(200);
    expect(res.body.totalSpent).toBe(12000);

    const byName = Object.fromEntries(
      res.body.balances.map((b: { name: string }) => [b.name, b]),
    );
    expect(byName.Adri).toMatchObject({ paid: 9000, owed: 4000, net: 5000 });
    expect(byName.Maria).toMatchObject({ paid: 3000, owed: 4000, net: -1000 });
    expect(byName.Tom).toMatchObject({ paid: 0, owed: 4000, net: -4000 });

    expect(res.body.settlements).toEqual([
      { from: tom._id, fromName: 'Tom', to: adri._id, toName: 'Adri', amount: 4000 },
      { from: maria._id, fromName: 'Maria', to: adri._id, toName: 'Adri', amount: 1000 },
    ]);
  });

  it('reflects an expense being deleted', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id, { amount: 9000 });
    await request(app).delete(`/api/v1/trips/${trip._id}/expenses/${expense._id}`);

    const res = await request(app).get(`/api/v1/trips/${trip._id}/balances`);
    expect(res.body.totalSpent).toBe(0);
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).get(`/api/v1/trips/${MISSING_ID}/balances`);
    expect(res.status).toBe(404);
  });

  it('returns empty balances for a trip with nobody on it', async () => {
    const trip = await makeTrip();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/balances`);
    expect(res.status).toBe(200);
    expect(res.body.balances).toEqual([]);
  });
});