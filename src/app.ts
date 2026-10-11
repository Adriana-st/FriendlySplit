import express, { Application, Request, Response } from "express";
import tripRoutes from './routes/trips';

export const app: Application = express();

app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.json());

app.get("/api/v1/health", async (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.use('/api/v1/trips', tripRoutes);
