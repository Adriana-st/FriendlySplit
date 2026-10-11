import { Router } from 'express';
import { TripController } from '../controllers/trips';

const router = Router();
const tripController = new TripController();

router.get('/', tripController.getTrips);
router.get('/:tripId', tripController.getTripById);
router.post('/', tripController.createTrip);
router.put('/:tripId', tripController.updateTrip);
router.delete('/:tripId', tripController.deleteTrip);

export default router;