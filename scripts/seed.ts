/**
 * Fills the database with the sample data in test-data/friendlysplit-testdata.json.
 * Run with:  npm run seed
 * WARNING: this deletes everything already in the trips, participants and expenses collections.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connectDB, disconnectDB } from '../src/config/database';
import { ExpenseModel } from '../src/models/expenses';
import { ParticipantModel } from '../src/models/participants';
import { TripModel } from '../src/models/trips';

const seed = async (): Promise<void> => {
  const file = join(__dirname, '..', 'test-data', 'friendlysplit-testdata.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));

  await connectDB();
  await Promise.all([TripModel.deleteMany({}), ParticipantModel.deleteMany({}), ExpenseModel.deleteMany({})]);
  await ParticipantModel.init(); // make sure the unique (trip, email) index exists

  await TripModel.insertMany(data.trips);
  await ParticipantModel.insertMany(data.participants);
  await ExpenseModel.insertMany(data.expenses);

  console.log(
    `Seeded ${data.trips.length} trips, ${data.participants.length} participants and ${data.expenses.length} expenses`
  );
  await disconnectDB();
};

seed().catch((error) => {
  console.error('Seeding failed', error);
  process.exit(1);
});