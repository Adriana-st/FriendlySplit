import request from "supertest";
import { app } from "../../src/app";
import {
  MISSING_ID,
  clearDb,
  makeExpense,
  makeParticipant,
  makeTrip,
  makeTripWithPeople,
} from '../helpers';

beforeEach(clearDb);

describe('POST /api/v1/trips/:tripId/participants', () => {
  it('adds a participant (201)', async () => {
    const trip = await makeTrip();
    const res = await request(app)
      .post(`/api/v1/trips/${trip._id}/participants`)
      .send({ name: 'Adri', email: 'Adri@Example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Adri', email: 'adri@example.com', trip: trip._id });
    expect(res.headers.location).toBe(`/api/v1/trips/${trip._id}/participants/${res.body._id}`);
  });

  it.each<[string, Record<string, unknown>]>([
    ['name is missing', { email: 'a@example.com' }],
    ['email is missing', { name: 'Adri' }],
    ['email is not a valid address', { name: 'Adri', email: 'not-an-email' }],
    ['name is empty', { name: '   ', email: 'a@example.com' }],
    ['an unknown property is sent', { name: 'Adri', email: 'a@example.com', role: 'admin' }],
  ])('rejects the participant when %s (400)', async (_label, body) => {
    const trip = await makeTrip();
    const res = await request(app).post(`/api/v1/trips/${trip._id}/participants`).send(body);
    expect(res.status).toBe(400);
  });

  it('returns 409 when the same email is added twice to one trip', async () => {
    const trip = await makeTrip();
    await makeParticipant(trip._id, 'Adri', 'adri@example.com');

    const res = await request(app)
      .post(`/api/v1/trips/${trip._id}/participants`)
      .send({ name: 'Adri again', email: 'ADRI@example.com' });
    expect(res.status).toBe(409);
  });

  it('allows the same email on a different trip', async () => {
    const tripA = await makeTrip({ name: 'Trip A' });
    const tripB = await makeTrip({ name: 'Trip B' });
    await makeParticipant(tripA._id, 'Adri', 'adri@example.com');

    const res = await request(app)
      .post(`/api/v1/trips/${tripB._id}/participants`)
      .send({ name: 'Adri', email: 'adri@example.com' });
    expect(res.status).toBe(201);
  });

  it('returns 404 when the trip does not exist', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${MISSING_ID}/participants`)
      .send({ name: 'Adri', email: 'adri@example.com' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/trips/:tripId/participants', () => {
  it('lists only the participants of that trip', async () => {
    const { trip } = await makeTripWithPeople();
    const other = await makeTrip({ name: 'Other trip' });
    await makeParticipant(other._id, 'Stranger');

    const res = await request(app).get(`/api/v1/trips/${trip._id}/participants?sort=name`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Adri', 'Maria', 'Tom']);
    expect(res.body.meta.total).toBe(3);
  });

  it('filters by name (partial, case-insensitive) and sorts descending', async () => {
    const { trip } = await makeTripWithPeople();
    const filtered = await request(app).get(`/api/v1/trips/${trip._id}/participants?name=mar`);
    expect(filtered.body.data.map((p: { name: string }) => p.name)).toEqual(['Maria']);

    const desc = await request(app).get(`/api/v1/trips/${trip._id}/participants?sort=-name`);
    expect(desc.body.data[0].name).toBe('Tom');
  });

  it('supports projection', async () => {
    const { trip } = await makeTripWithPeople();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/participants?fields=name`);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['_id', 'name']);
  });

  it('returns 404 for an unknown trip and 400 for a bad query', async () => {
    expect((await request(app).get(`/api/v1/trips/${MISSING_ID}/participants`)).status).toBe(404);
    const trip = await makeTrip();
    expect((await request(app).get(`/api/v1/trips/${trip._id}/participants?sort=email`)).status).toBe(400);
  });
});

describe('GET /api/v1/trips/:tripId/participants/:participantId', () => {
  it('returns one participant (200)', async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');
    const res = await request(app).get(`/api/v1/trips/${trip._id}/participants/${adri._id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Adri');
  });

  it('returns 404 when the participant does not exist', async () => {
    const trip = await makeTrip();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/participants/${MISSING_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Participant not found');
  });

  it('returns 404 when the participant belongs to a different trip', async () => {
    const tripA = await makeTrip({ name: 'Trip A' });
    const tripB = await makeTrip({ name: 'Trip B' });
    const adri = await makeParticipant(tripA._id, 'Adri');
    const res = await request(app).get(`/api/v1/trips/${tripB._id}/participants/${adri._id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const trip = await makeTrip();
    const res = await request(app).get(`/api/v1/trips/${trip._id}/participants/abc`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/trips/:tripId/participants/:participantId', () => {
  it('updates a participant (200)', async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/participants/${adri._id}`)
      .send({ name: 'Adriana', email: 'adriana@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Adriana', email: 'adriana@example.com' });
  });

  it('allows saving a participant with their own unchanged email', async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/participants/${adri._id}`)
      .send({ name: 'Adriana', email: adri.email });
    expect(res.status).toBe(200);
  });

  it('returns 404 when the participant does not exist', async () => {
    const trip = await makeTrip();
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/participants/${MISSING_ID}`)
      .send({ name: 'Ghost', email: 'ghost@example.com' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when the data is not valid', async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/participants/${adri._id}`)
      .send({ name: 'Adri', email: 'broken' });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the new email already belongs to someone else on the trip", async () => {
    const { trip, adri, maria } = await makeTripWithPeople();
    const res = await request(app)
      .put(`/api/v1/trips/${trip._id}/participants/${adri._id}`)
      .send({ name: 'Adri', email: maria.email });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/v1/trips/:tripId/participants/:participantId', () => {
  it('deletes a participant (204)', async () => {
    const trip = await makeTrip();
    const adri = await makeParticipant(trip._id, 'Adri');

    const res = await request(app).delete(`/api/v1/trips/${trip._id}/participants/${adri._id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/v1/trips/${trip._id}/participants/${adri._id}`)).status).toBe(404);
  });

  it('returns 404 when the participant does not exist', async () => {
    const trip = await makeTrip();
    const res = await request(app).delete(`/api/v1/trips/${trip._id}/participants/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when the participant is used by an expense', async () => {
    const { trip, adri } = await makeTripWithPeople();
    await makeExpense(trip._id, adri._id);

    const res = await request(app).delete(`/api/v1/trips/${trip._id}/participants/${adri._id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/used by existing expenses/);
  });

  it('returns 409 when the participant only appears in the split of an expense', async () => {
    const { trip, adri, tom } = await makeTripWithPeople();
    await makeExpense(trip._id, adri._id); // equal split includes Tom

    const res = await request(app).delete(`/api/v1/trips/${trip._id}/participants/${tom._id}`);
    expect(res.status).toBe(409);
  });
});