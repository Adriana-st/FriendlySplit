import { Router } from 'express';
import { TripController } from '../controllers/trips';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware';
import { tripParamsZSchema } from '../models/common';
import { tripQueryZSchema, tripZSchema } from '../models/trips';
import participantRoutes from './participants';
import expenseRoutes from './expenses';
import balanceRoutes from './balances';

const router = Router();
const tripController = new TripController();

router.get('/', validateQuery(tripQueryZSchema), tripController.getTrips);
router.get('/:tripId', validateParams(tripParamsZSchema), tripController.getTripById);
router.post('/', validate(tripZSchema), tripController.createTrip);
router.put('/:tripId', validateParams(tripParamsZSchema), validate(tripZSchema), tripController.updateTrip);
router.delete('/:tripId', validateParams(tripParamsZSchema), tripController.deleteTrip);

// Nested resources: everything under /trips/:tripId/...
router.use('/:tripId/participants', participantRoutes);
router.use('/:tripId/expenses', expenseRoutes);
router.use('/:tripId/balances', balanceRoutes);

export default router;