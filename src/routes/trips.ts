import { Router } from 'express';
import { TripController } from '../controllers/trips';
import { validate, validateIds, validateQuery } from '../middleware/validate.middleware';
import { tripQueryZSchema, tripZSchema } from '../models/trips';
import participantRoutes from './participants';
import expenseRoutes from './expenses';
import balanceRoutes from './balances';

const router = Router();
const tripController = new TripController();

router.get('/', validateQuery(tripQueryZSchema), tripController.getTrips);
router.get('/:tripId', validateIds, tripController.getTripById);
router.post('/', validate(tripZSchema), tripController.createTrip);
router.put('/:tripId', validateIds, validate(tripZSchema), tripController.updateTrip);
router.delete('/:tripId', validateIds, tripController.deleteTrip);

// Nested resources: everything under /trips/:tripId/...
router.use('/:tripId/participants', participantRoutes);
router.use('/:tripId/expenses', expenseRoutes);
router.use('/:tripId/balances', balanceRoutes);

export default router;