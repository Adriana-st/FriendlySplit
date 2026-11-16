import request from "supertest";
import { app } from "../../src/app";
import {
  MISSING_ID,
  clearDb,
  makeExpense,
  makeParticipant,
  makeTrip,
  makeTripWithPeople,
  tripData,
} from '../helpers';

beforeEach(clearDb);

describe('POST /api/v1/trips', () => {
  it('creates a trip with valid data (201 + Location header)', async () => {
    const res = await request(app).post('/api/v1/trips').send(tripData());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Lisbon City Break', currency: 'EUR', destination: 'Lisbon' });
    expect(res.body._id).toMatch(/^[0-9a-f]{24}$/);
    expect(res.body.__v).toBeUndefined();
    expect(res.body.id).toBeUndefined();
    expect(res.headers.location).toBe(`/api/v1/trips/${res.body._id}`);
  });

  it('upper-cases the currency code', async () => {
    const res = await request(app).post('/api/v1/trips').send(tripData({ currency: 'eur' }));
    expect(res.status).toBe(201);
    expect(res.body.currency).toBe('EUR');
  });

  it('works without the optional destination', async () => {
    const { destination, ...withoutDestination } = tripData();
    const res = await request(app).post('/api/v1/trips').send(withoutDestination);
    expect(destination).toBe('Lisbon');
    expect(res.status).toBe(201);
    expect(res.body.destination).toBeUndefined();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ['name is missing', { name: undefined }, 'name'],
    ['name is too short', { name: 'ab' }, 'name'],
    ['currency is not 3 letters', { currency: 'EURO' }, 'currency'],
    ['currency contains digits', { currency: 'E1R' }, 'currency'],
    ['start date is not a real date', { startDate: '2026-02-31' }, 'startDate'],
    ['start date has the wrong format', { startDate: '01/07/2026' }, 'startDate'],
    ['end date is before start date', { endDate: '2026-06-01' }, 'endDate'],
    ['name is not a string', { name: 12345 }, 'name'],
  ])('rejects the trip when %s (400)', async (_label, overrides, field) => {
    const res = await request(app).post('/api/v1/trips').send(tripData(overrides));

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { path: string }) => e.path)).toContain(field);
  });

  it('rejects unknown properties instead of silently ignoring them (400)', async () => {
    const res = await request(app).post('/api/v1/trips').send(tripData({ isAdmin: true }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/trips', () => {
  it('returns an empty list when there are no trips', async () => {
    const res = await request(app).get('/api/v1/trips');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });

  describe('with several trips', () => {
    beforeEach(async () => {
      await makeTrip({ name: 'Lisbon City Break', destination: 'Lisbon', currency: 'EUR', startDate: '2026-07-01', endDate: '2026-07-08' });
      await makeTrip({ name: 'Edinburgh Festival', destination: 'Edinburgh', currency: 'GBP', startDate: '2026-08-10', endDate: '2026-08-15' });
      await makeTrip({ name: 'Wild Atlantic Way', destination: 'Donegal', currency: 'EUR', startDate: '2026-09-04', endDate: '2026-09-07' });
    });

    it('lists all trips, newest start date first by default', async () => {
      const res = await request(app).get('/api/v1/trips');
      expect(res.status).toBe(200);
      expect(res.body.data.map((t: { name: string }) => t.name)).toEqual([
        'Wild Atlantic Way',
        'Edinburgh Festival',
        'Lisbon City Break',
      ]);
      expect(res.body.meta.total).toBe(3);
    });

    it('filters by destination (partial, case-insensitive)', async () => {
      const res = await request(app).get('/api/v1/trips?destination=lis');
      expect(res.body.data.map((t: { destination: string }) => t.destination)).toEqual(['Lisbon']);
    });

    it('filters by currency', async () => {
      const res = await request(app).get('/api/v1/trips?currency=gbp');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Edinburgh Festival');
    });

    it('filters by start date range', async () => {
      const res = await request(app).get('/api/v1/trips?startsAfter=2026-08-01&startsBefore=2026-08-31');
      expect(res.body.data.map((t: { name: string }) => t.name)).toEqual(['Edinburgh Festival']);
    });

    it('sorts by name ascending and descending', async () => {
      const asc = await request(app).get('/api/v1/trips?sort=name');
      expect(asc.body.data.map((t: { name: string }) => t.name)).toEqual([
        'Edinburgh Festival',
        'Lisbon City Break',
        'Wild Atlantic Way',
      ]);
      const desc = await request(app).get('/api/v1/trips?sort=-name');
      expect(desc.body.data[0].name).toBe('Wild Atlantic Way');
    });

    it('pages the results', async () => {
      const res = await request(app).get('/api/v1/trips?sort=name&limit=2&page=2');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Wild Atlantic Way');
      expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('returns only the requested fields (projection)', async () => {
      const res = await request(app).get('/api/v1/trips?fields=name,currency');
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['_id', 'currency', 'name']);
    });

    it.each([
      ['an unknown sort field', 'sort=colour'],
      ['an unknown projection field', 'fields=password'],
      ['a page of zero', 'page=0'],
      ['a limit above 100', 'limit=500'],
      ['a currency that is not 3 letters', 'currency=EURO'],
      ['a date in the wrong format', 'startsAfter=yesterday'],
      ['an unknown query parameter', 'colour=blue'],
      ['a MongoDB operator in the query string (injection attempt)', 'destination[$ne]=x'],
    ])('rejects %s (400)', async (_label, queryString) => {
      const res = await request(app).get(`/api/v1/trips?${queryString}`);
      expect(res.status).toBe(400);
    });

    it('treats regex characters in a search as plain text', async () => {
      const res = await request(app).get('/api/v1/trips?destination=.*');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});

describe('GET /api/v1/trips/:tripId', () => {
  it('returns one trip (200)', async () => {
    const trip = await makeTrip();
    const res = await request(app).get(`/api/v1/trips/${trip._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(trip._id);
    expect(res.body.name).toBe('Lisbon City Break');
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).get(`/api/v1/trips/${MISSING_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Trip not found');
  });

  it('returns 400 when the id is not a valid id', async () => {
    const res = await request(app).get('/api/v1/trips/not-an-id');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/trips/:tripId', () => {
  it('replaces the trip (200)', async () => {
    const trip = await makeTrip();
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}`)
      .send(tripData({ name: 'Lisbon and Sintra', endDate: '2026-07-10' }));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Lisbon and Sintra');
    expect(res.body.endDate).toBe('2026-07-10T00:00:00.000Z');

    const check = await request(app).get(`/api/v1/trips/${trip._id}`);
    expect(check.body.name).toBe('Lisbon and Sintra');
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).put(`/api/v1/trips/${MISSING_ID}`).send(tripData());
    expect(res.status).toBe(404);
  });

  it('returns 400 when the data is not valid, and leaves the trip unchanged', async () => {
    const trip = await makeTrip();
    const res = await request(app).put(`/api/v1/trips/${trip._id}`).send(tripData({ name: 'x', endDate: '2020-01-01' }));
    expect(res.status).toBe(400);

    const check = await request(app).get(`/api/v1/trips/${trip._id}`);
    expect(check.body.name).toBe('Lisbon City Break');
  });

  it('returns 422 if the new dates would leave an expense outside the trip', async () => {
    const { trip, adri } = await makeTripWithPeople();
    await makeExpense(trip._id, adri._id, { date: '2026-07-07' });

    const res = await request(app).put(`/api/v1/trips/${trip._id}`).send(tripData({ endDate: '2026-07-04' }));
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/outside the trip/);
  });
});

describe('DELETE /api/v1/trips/:tripId', () => {
  it('deletes the trip (204) and its participants and expenses', async () => {
    const { trip, adri } = await makeTripWithPeople();
    await makeExpense(trip._id, adri._id);

    const res = await request(app).delete(`/api/v1/trips/${trip._id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    expect((await request(app).get(`/api/v1/trips/${trip._id}`)).status).toBe(404);

    // The children are gone too: a new trip starts with nothing
    const other = await makeTrip({ name: 'Another trip' });
    const people = await request(app).get(`/api/v1/trips/${other._id}/participants`);
    expect(people.body.data).toEqual([]);
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app).delete(`/api/v1/trips/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).delete('/api/v1/trips/123');
    expect(res.status).toBe(400);
  });

  it('only deletes the requested trip', async () => {
    const keep = await makeTrip({ name: 'Keep me' });
    const remove = await makeTrip({ name: 'Remove me' });
    await makeParticipant(keep._id, 'Adri');

    await request(app).delete(`/api/v1/trips/${remove._id}`);

    expect((await request(app).get(`/api/v1/trips/${keep._id}`)).status).toBe(200);
    const people = await request(app).get(`/api/v1/trips/${keep._id}/participants`);
    expect(people.body.data).toHaveLength(1);
  });
});