import request from "supertest";
import { app } from "../../src/app";
import {
  MISSING_ID,
  clearDb,
  expenseData,
  makeExpense,
  makeParticipant,
  makeTrip,
  makeTripWithPeople,
} from '../helpers';

beforeEach(clearDb);

const sum = (splits: { share: number }[]) => splits.reduce((total, s) => total + s.share, 0);

describe('POST /api/v1/trips/:tripId/expenses', () => {
  it('creates an expense with explicit splits (201)', async () => {
    const { trip, adri, maria } = await makeTripWithPeople();
    const res = await request(app)
      .post(`/api/v1/trips/${trip._id}/expenses`)
      .send(
        expenseData(adri._id, {
          amount: 5000,
          splits: [
            { participant: adri._id, share: 3000 },
            { participant: maria._id, share: 2000 },
          ],
        }),
      );

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 5000, category: 'food', paidBy: adri._id, trip: trip._id });
    expect(res.body.splits).toEqual([
      { participant: adri._id, share: 3000 },
      { participant: maria._id, share: 2000 },
    ]);
    expect(res.headers.location).toBe(`/api/v1/trips/${trip._id}/expenses/${res.body._id}`);
  });

  it('splits equally between everyone when splits is left out', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id, { amount: 6000 });
    expect(expense.splits.map((s) => s.share)).toEqual([2000, 2000, 2000]);
  });

  it('gives leftover cents to the first people so the shares still add up', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id, { amount: 1000 });
    expect(expense.splits.map((s) => s.share)).toEqual([334, 333, 333]);
    expect(sum(expense.splits)).toBe(1000);
  });

  it('accepts an expense dated on the first and last day of the trip', async () => {
    const { trip, adri } = await makeTripWithPeople();
    expect((await request(app).post(`/api/v1/trips/${trip._id}/expenses`).send(expenseData(adri._id, { date: '2026-07-01' }))).status).toBe(201);
    expect((await request(app).post(`/api/v1/trips/${trip._id}/expenses`).send(expenseData(adri._id, { date: '2026-07-08' }))).status).toBe(201);
  });

  describe('fails validation (400)', () => {
    const cases: [string, Record<string, unknown>, string][] = [
      ['amount is zero', { amount: 0 }, 'amount'],
      ['amount is negative', { amount: -500 }, 'amount'],
      ['amount has a decimal part', { amount: 10.5 }, 'amount'],
      ['amount is a string', { amount: '6000' }, 'amount'],
      ['description is empty', { description: '  ' }, 'description'],
      ['category is not allowed', { category: 'gambling' }, 'category'],
      ['date is not a real date', { date: '2026-13-45' }, 'date'],
      ['paidBy is not a valid id', { paidBy: 'adri' }, 'paidBy'],
      ['an unknown property is sent', { discount: 10 }, ''],
    ];

    it.each(cases)('when %s', async (_label, overrides, field) => {
      const { trip, adri } = await makeTripWithPeople();
      const res = await request(app).post(`/api/v1/trips/${trip._id}/expenses`).send(expenseData(adri._id, overrides));

      expect(res.status).toBe(400);
      if (field) expect(res.body.errors.map((e: { path: string }) => e.path)).toContain(field);
    });

    it('when the shares do not add up to the amount', async () => {
      const { trip, adri, maria } = await makeTripWithPeople();
      const res = await request(app)
        .post(`/api/v1/trips/${trip._id}/expenses`)
        .send(
          expenseData(adri._id, {
            amount: 5000,
            splits: [
              { participant: adri._id, share: 3000 },
              { participant: maria._id, share: 1000 },
            ],
          }),
        );

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/Shares must add up to the amount \(5000\) but add up to 4000/);
    });

    it('when a participant appears twice in splits', async () => {
      const { trip, adri } = await makeTripWithPeople();
      const res = await request(app)
        .post(`/api/v1/trips/${trip._id}/expenses`)
        .send(
          expenseData(adri._id, {
            amount: 1000,
            splits: [
              { participant: adri._id, share: 500 },
              { participant: adri._id, share: 500 },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });

    it('when a share is negative or has a decimal', async () => {
      const { trip, adri, maria } = await makeTripWithPeople();
      const res = await request(app)
        .post(`/api/v1/trips/${trip._id}/expenses`)
        .send(
          expenseData(adri._id, {
            amount: 1000,
            splits: [
              { participant: adri._id, share: 1500 },
              { participant: maria._id, share: -500.5 },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });
  });

  describe('breaks a business rule (422)', () => {
    it('when the date is outside the trip', async () => {
      const { trip, adri } = await makeTripWithPeople();
      const res = await request(app).post(`/api/v1/trips/${trip._id}/expenses`).send(expenseData(adri._id, { date: '2026-07-09' }));
      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/2026-07-01 to 2026-07-08/);
    });

    it('when the payer is not on this trip', async () => {
      const { trip } = await makeTripWithPeople();
      const otherTrip = await makeTrip({ name: 'Other trip' });
      const stranger = await makeParticipant(otherTrip._id, 'Stranger');

      const res = await request(app).post(`/api/v1/trips/${trip._id}/expenses`).send(expenseData(stranger._id));
      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/paidBy/);
    });

    it('when someone in splits is not on this trip', async () => {
      const { trip, adri } = await makeTripWithPeople();
      const otherTrip = await makeTrip({ name: 'Other trip' });
      const stranger = await makeParticipant(otherTrip._id, 'Stranger');

      const res = await request(app)
        .post(`/api/v1/trips/${trip._id}/expenses`)
        .send(
          expenseData(adri._id, {
            amount: 1000,
            splits: [
              { participant: adri._id, share: 500 },
              { participant: stranger._id, share: 500 },
            ],
          }),
        );
      expect(res.status).toBe(422);
      expect(res.body.errors).toEqual([stranger._id]);
    });
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).post(`/api/v1/trips/${MISSING_ID}/expenses`).send(expenseData(MISSING_ID));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/trips/:tripId/expenses', () => {
  async function seed() {
    const people = await makeTripWithPeople();
    const { trip, adri, maria } = people;
    await makeExpense(trip._id, adri._id, { description: 'Hotel Alfama', amount: 45000, category: 'accommodation', date: '2026-07-01' });
    await makeExpense(trip._id, maria._id, { description: 'Tram 28 tickets', amount: 1800, category: 'transport', date: '2026-07-02' });
    await makeExpense(trip._id, adri._id, { description: 'Pastel de nata', amount: 900, category: 'food', date: '2026-07-03' });
    await makeExpense(trip._id, maria._id, { description: 'Seafood dinner', amount: 9000, category: 'food', date: '2026-07-04' });
    return people;
  }

  it('lists the expenses of the trip, newest first by default', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(4);
    expect(res.body.data.map((e: { description: string }) => e.description)).toEqual([
      'Seafood dinner',
      'Pastel de nata',
      'Tram 28 tickets',
      'Hotel Alfama',
    ]);
  });

  it('does not include expenses from other trips', async () => {
    const { trip } = await seed();
    const { trip: otherTrip, adri } = await makeTripWithPeople();
    await makeExpense(otherTrip._id, adri._id);

    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses`);
    expect(res.body.meta.total).toBe(4);
  });

  it('filters by category', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?category=food`);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((e: { category: string }) => e.category === 'food')).toBe(true);
  });

  it('filters by who paid', async () => {
    const { trip, maria } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?paidBy=${maria._id}`);
    expect(res.body.data.map((e: { description: string }) => e.description).sort()).toEqual(['Seafood dinner', 'Tram 28 tickets']);
  });

  it('filters by amount range', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?minAmount=1000&maxAmount=10000`);
    expect(res.body.data.map((e: { amount: number }) => e.amount).sort((a: number, b: number) => a - b)).toEqual([1800, 9000]);
  });

  it('filters by date range', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?from=2026-07-02&to=2026-07-03`);
    expect(res.body.data.map((e: { description: string }) => e.description).sort()).toEqual(['Pastel de nata', 'Tram 28 tickets']);
  });

  it('searches the description (case-insensitive)', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?search=DINNER`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe('Seafood dinner');
  });

  it('combines several filters', async () => {
    const { trip, maria } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?category=food&paidBy=${maria._id}`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe('Seafood dinner');
  });

  it('sorts by amount ascending and descending', async () => {
    const { trip } = await seed();
    const asc = await request(app).get(`/api/v1/trips/${trip._id}/expenses?sort=amount`);
    expect(asc.body.data.map((e: { amount: number }) => e.amount)).toEqual([900, 1800, 9000, 45000]);
    const desc = await request(app).get(`/api/v1/trips/${trip._id}/expenses?sort=-amount`);
    expect(desc.body.data.map((e: { amount: number }) => e.amount)).toEqual([45000, 9000, 1800, 900]);
  });

  it('pages the results', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?sort=amount&limit=3&page=2`);
    expect(res.body.data.map((e: { amount: number }) => e.amount)).toEqual([45000]);
    expect(res.body.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
  });

  it('returns only the requested fields (projection)', async () => {
    const { trip } = await seed();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?fields=description,amount`);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['_id', 'amount', 'description']);
  });

  it.each([
    ['an unknown category', 'category=weapons'],
    ['a paidBy that is not an id', 'paidBy=adri'],
    ['a negative minAmount', 'minAmount=-5'],
    ['minAmount above maxAmount', 'minAmount=500&maxAmount=100'],
    ['a bad date', 'from=tomorrow'],
    ['an unknown sort field', 'sort=description'],
    ['an unknown projection field', 'fields=password'],
    ['a MongoDB operator in the query string', 'amount[$gt]=0'],
  ])('rejects %s (400)', async (_label, queryString) => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses?${queryString}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).get(`/api/v1/trips/${MISSING_ID}/expenses`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/trips/:tripId/expenses/:expenseId', () => {
  it('returns one expense (200)', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id);
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses/${expense._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(expense._id);
  });

  it('returns 404 when the expense does not exist', async () => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses/${MISSING_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Expense not found');
  });

  it('returns 404 when the expense belongs to a different trip', async () => {
    const { trip: tripA, adri } = await makeTripWithPeople();
    const { trip: tripB } = await makeTripWithPeople();
    const expense = await makeExpense(tripA._id, adri._id);
    const res = await request(app).get(`/api/v1/trips/${tripB._id}/expenses/${expense._id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/expenses/xyz`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/trips/:tripId/expenses/:expenseId', () => {
  it('replaces an expense (200)', async () => {
    const { trip, adri, maria } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id);

    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/expenses/${expense._id}`)
      .send(
        expenseData(maria._id, {
          description: 'Corrected dinner',
          amount: 7000,
          splits: [
            { participant: adri._id, share: 3500 },
            { participant: maria._id, share: 3500 },
          ],
        }),
      );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ description: 'Corrected dinner', amount: 7000, paidBy: maria._id });
    expect(sum(res.body.splits)).toBe(7000);

    const check = await request(app).get(`/api/v1/trips/${trip._id}/expenses/${expense._id}`);
    expect(check.body.description).toBe('Corrected dinner');
  });

  it('returns 404 when the expense does not exist', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const res = await request(app).put(`/api/v1/trips/${trip._id}/expenses/${MISSING_ID}`).send(expenseData(adri._id));
    expect(res.status).toBe(404);
  });

  it('returns 400 when the data is not valid, and leaves the expense unchanged', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id, { amount: 6000 });

    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/expenses/${expense._id}`)
      .send(expenseData(adri._id, { amount: -1 }));
    expect(res.status).toBe(400);

    const check = await request(app).get(`/api/v1/trips/${trip._id}/expenses/${expense._id}`);
    expect(check.body.amount).toBe(6000);
  });

  it('returns 422 when the new date is outside the trip', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id);
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/expenses/${expense._id}`)
      .send(expenseData(adri._id, { date: '2027-01-01' }));
    expect(res.status).toBe(422);
  });
});

describe('DELETE /api/v1/trips/:tripId/expenses/:expenseId', () => {
  it('deletes an expense (204)', async () => {
    const { trip, adri } = await makeTripWithPeople();
    const expense = await makeExpense(trip._id, adri._id);

    const res = await request(app).delete(`/api/v1/trips/${trip._id}/expenses/${expense._id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/v1/trips/${trip._id}/expenses/${expense._id}`)).status).toBe(404);
  });

  it('returns 404 when the expense does not exist', async () => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).delete(`/api/v1/trips/${trip._id}/expenses/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 and deletes nothing when the expense is on a different trip', async () => {
    const { trip: tripA, adri } = await makeTripWithPeople();
    const { trip: tripB } = await makeTripWithPeople();
    const expense = await makeExpense(tripA._id, adri._id);

    const res = await request(app).delete(`/api/v1/trips/${tripB._id}/expenses/${expense._id}`);
    expect(res.status).toBe(404);
    expect((await request(app).get(`/api/v1/trips/${tripA._id}/expenses/${expense._id}`)).status).toBe(200);
  });
});