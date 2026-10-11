import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/database";
import { env } from "../src/config/env";

beforeAll(async () => {
    // The tests empty their database, so they must never run against the real one
    if (env.mongoTestURI === env.mongoURI) {
        throw new Error("MONGODB_TEST_URI must be a different database from MONGODB_URI");
    }
    await connectDB(env.mongoTestURI);
});

afterAll(async () => {
    await Promise.all(
        Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
    );
    await disconnectDB();
});
