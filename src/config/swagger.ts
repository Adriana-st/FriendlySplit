import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'FriendlySplit API',
            version: '1.0.0',
            description:
                'REST API for FriendlySplit, a web application that helps groups of friends share the cost of a trip. ' +
                'A trip has many participants and many expenses. Each expense is paid by one participant and divided ' +
                'between several participants. The API can also calculate balances (who owes whom). ' +
                'All money amounts are whole numbers of cents (4550 = 45.50). Dates are written YYYY-MM-DD. ' +
                '400 = failed validation, 404 = not found, 409 = conflicts with existing data, ' +
                '422 = well formed but breaks a business rule. PUT replaces the whole resource.'
        },
        servers: [
            {
                url: "/api/v1",
            },
        ],
        tags: [
            { name: 'Trips' },
            { name: 'Participants' },
            { name: 'Expenses' },
            { name: 'Balances' },
        ],
        components: {
            parameters: {
                TripId: {
                    in: 'path',
                    name: 'tripId',
                    required: true,
                    description: 'Id of the trip',
                    schema: { $ref: '#/components/schemas/ObjectId' },
                },
                ParticipantId: {
                    in: 'path',
                    name: 'participantId',
                    required: true,
                    description: 'Id of the participant',
                    schema: { $ref: '#/components/schemas/ObjectId' },
                },
                ExpenseId: {
                    in: 'path',
                    name: 'expenseId',
                    required: true,
                    description: 'Id of the expense',
                    schema: { $ref: '#/components/schemas/ObjectId' },
                },
                Page: {
                    in: 'query',
                    name: 'page',
                    description: 'Page number, starting at 1',
                    schema: { type: 'integer', minimum: 1, default: 1 },
                },
                Limit: {
                    in: 'query',
                    name: 'limit',
                    description: 'Items per page',
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
            },
            responses: {
                ValidationError: {
                    description: 'The request failed validation (bad body, query string or id)',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorBody' } } },
                },
                NotFound: {
                    description: 'The trip, participant or expense does not exist',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } },
                },
                Conflict: {
                    description: 'The request conflicts with existing data (duplicate email, or participant still in use)',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } },
                },
                Unprocessable: {
                    description: 'Well formed request that breaks a business rule (for example a date outside the trip)',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } },
                },
            },
            schemas: {
                ObjectId: {
                    type: 'string',
                    pattern: '^[0-9a-fA-F]{24}$',
                    example: '64f000000000000000000001',
                },
                ListMeta: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 20 },
                        total: { type: 'integer', example: 3 },
                        totalPages: { type: 'integer', example: 1 },
                    },
                },
                ErrorBody: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Trip not found' },
                        errors: { description: 'Extra information when available' },
                    },
                },
                ValidationErrorBody: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Validation failed' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    path: { type: 'string', example: 'endDate' },
                                    message: { type: 'string', example: 'endDate must not be before startDate' },
                                },
                            },
                        },
                    },
                },
                Balances: {
                    type: 'object',
                    properties: {
                        trip: { $ref: '#/components/schemas/ObjectId' },
                        currency: { type: 'string', example: 'EUR' },
                        totalSpent: { type: 'integer', description: 'Total of all expenses in cents', example: 12000 },
                        balances: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    participant: { $ref: '#/components/schemas/ObjectId' },
                                    name: { type: 'string', example: 'Adri' },
                                    paid: { type: 'integer', example: 9000 },
                                    owed: { type: 'integer', example: 4000 },
                                    net: { type: 'integer', description: 'paid minus owed', example: 5000 },
                                },
                            },
                        },
                        settlements: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    from: { $ref: '#/components/schemas/ObjectId' },
                                    fromName: { type: 'string', example: 'Tom' },
                                    to: { $ref: '#/components/schemas/ObjectId' },
                                    toName: { type: 'string', example: 'Adri' },
                                    amount: { type: 'integer', example: 4000 },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/controllers/*.ts', './src/models/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);