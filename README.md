# FriendlySplit API (Part 1)

A REST API for FriendlySplit, a web application that helps groups of friends share the cost of a trip. A user creates a trip, adds the people who are going, records expenses (who paid, how much and how it is divided) and asks the API who owes whom.

This is Part 1 of the project, so only the server side exists.

Built with TypeScript, Express 5, Mongoose (MongoDB) and Zod. Tested with Vitest and Supertest, and manually with the REST Client extension for VS Code. Documented with OpenAPI 3 (swagger-jsdoc and Swagger UI).

## Requirements

- Node.js 20 or newer
- A MongoDB database. The included `.env` file already holds the connection strings (MongoDB Atlas).

## Setup

```bash
npm install
npm run seed    # loads test-data/friendlysplit-testdata.json (empties the 3 collections first)
npm run dev     # http://localhost:3000/api/v1
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API with tsx |
| `npm run build` | Compiles the TypeScript |
| `npm start` | Runs the compiled build |
| `npm run typecheck` | Checks the types without building |
| `npm run seed` | Loads the test data into the database |
| `npm run openapi` | Writes the OpenAPI schema to `openapi.json` |
| `npm test` | Runs the unit and API tests |

## Project layout

- `src/` - the API: routes, controllers, services, models (Mongoose and Zod) and config
- `tests/` - the automated tests, plus `tests/manual/friendlysplit.http` for REST Client
- `test-data/` - the JSON test data used by the seed script
- `openapi.json` - the OpenAPI schema

## Documentation and tests

- Swagger UI: http://localhost:3000/api-docs (schema file: `openapi.json`)
- Manual tests: `tests/manual/friendlysplit.http` (REST Client extension)
- Automated tests: `npm test`

## Endpoints

All endpoints start with `/api/v1`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/trips` | List trips (filter, sort, choose fields, page) |
| POST | `/trips` | Create a trip |
| GET | `/trips/{tripId}` | Get one trip |
| PUT | `/trips/{tripId}` | Replace a trip |
| DELETE | `/trips/{tripId}` | Delete a trip, with its participants and expenses |
| GET | `/trips/{tripId}/participants` | List the participants of a trip |
| POST | `/trips/{tripId}/participants` | Add a participant |
| GET | `/trips/{tripId}/participants/{participantId}` | Get one participant |
| PUT | `/trips/{tripId}/participants/{participantId}` | Replace a participant |
| DELETE | `/trips/{tripId}/participants/{participantId}` | Delete a participant |
| GET | `/trips/{tripId}/expenses` | List the expenses of a trip (filter, search, sort, page) |
| POST | `/trips/{tripId}/expenses` | Add an expense |
| GET | `/trips/{tripId}/expenses/{expenseId}` | Get one expense |
| PUT | `/trips/{tripId}/expenses/{expenseId}` | Replace an expense |
| DELETE | `/trips/{tripId}/expenses/{expenseId}` | Delete an expense |
| GET | `/trips/{tripId}/balances` | Who owes whom for the trip |

There is also `GET /api/v1/health`, which reports whether the API and database are up.

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | Success |
| 201 | Created (the `Location` header gives the new resource) |
| 204 | Deleted, no content |
| 400 | Invalid data, invalid id or malformed JSON |
| 404 | Trip, participant or expense not found |
| 409 | Conflict, for example the same email twice on one trip |
| 422 | Breaks a business rule, for example an expense dated outside the trip |

Amounts are whole cents, so `6000` means 60.00 in the currency of the trip.
