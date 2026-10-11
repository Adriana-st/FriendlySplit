import express, { Application, Request, Response } from "express";
import tripRoutes from './routes/trips';
import { logger } from "./middleware/logging.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app: Application = express();

app.use(logger);
app.use(express.json());

app.get("/api/v1/health", async (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.use('/api/v1/trips', tripRoutes);

app.use(notFoundHandler);
app.use(errorHandler);