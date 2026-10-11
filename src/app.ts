import express, { Application, Request, Response } from "express";

const PORT = process.env.PORT || 3000;

const app: Application = express();

app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

app.get("/api/v1/health", async (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});