import { Router } from 'express';
import { TripController } from '../controllers/trips';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware';
import { tripParamsZSchema } from '../models/common';
import { tripQueryZSchema, tripZSchema } from '../models/trips';
import participantRoutes from './participants';

const router = Router();
const tripController = new TripController();

router.get('/', validateQuery(tripQueryZSchema), tripController.getTrips);
router.get('/:tripId', validateParams(tripParamsZSchema), tripController.getTripById);
router.post('/', validate(tripZSchema), tripController.createTrip);
router.put('/:tripId', validateParams(tripParamsZSchema), validate(tripZSchema), tripController.updateTrip);
router.delete('/:tripId', validateParams(tripParamsZSchema), tripController.deleteTrip);

// Nested resources: everything under /trips/:tripId/...
router.use('/:tripId/participants', participantRoutes);

export default router;