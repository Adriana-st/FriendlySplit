import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (uri: string = env.mongoURI): Promise<void> => {
  try {
    // Refuse query filters containing unknown fields instead of silently ignoring them
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected (Mongoose): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
