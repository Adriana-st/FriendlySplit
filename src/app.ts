import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import tripRoutes from './routes/trips';
import { logger } from "./middleware/logging.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { env } from "./config/env";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from "./config/swagger";

export const app: Application = express();
app.use(logger);
app.use(helmet());                        // secure HTTP headers
app.use(express.json({ limit: '10kb' })); // refuse huge request bodies

// Limit how often one client can call the API (switched off while testing)
if (env.nodeEnv !== 'test') {
    app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use('/api/v1/trips', tripRoutes);

app.use(notFoundHandler);
app.use(errorHandler);