import request from "supertest";
import { app } from "../../src/app";

describe('General API behaviour', () => {

    it('GET /api/v1/health reports the API and database are up', async () => {
        const response = await request(app).get('/api/v1/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    });

    it('returns 404 JSON for a route that does not exist', async () => {
        const response = await request(app).get('/api/v1/unicorns');

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/does not exist/);
    });

    it('returns 400 for a request body that is not valid JSON', async () => {
        const response = await request(app)
            .post('/api/v1/trips')
            .set('Content-Type', 'application/json')
            .send('{"name": "Broken"');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Request body is not valid JSON');
    });

    it('returns 413 for a request body that is too large', async () => {
        const response = await request(app)
            .post('/api/v1/trips')
            .send({ name: 'x'.repeat(20_000) });

        expect(response.status).toBe(413);
    });

    it('sends security headers (helmet) and hides the framework name', async () => {
        const response = await request(app).get('/api/v1/health');

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('serves the OpenAPI schema with every endpoint', async () => {
        const response = await request(app).get('/api-docs.json');

        expect(response.status).toBe(200);
        expect(Object.keys(response.body.paths)).toEqual(
            expect.arrayContaining([
                '/trips',
                '/trips/{tripId}',
                '/trips/{tripId}/participants',
                '/trips/{tripId}/participants/{participantId}',
                '/trips/{tripId}/expenses',
                '/trips/{tripId}/expenses/{expenseId}',
                '/trips/{tripId}/balances',
            ])
        );
    });
});