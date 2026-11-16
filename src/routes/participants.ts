import { Router } from 'express';
import { ParticipantController } from '../controllers/participants';
import { validate, validateIds, validateQuery } from '../middleware/validate.middleware';
import { participantQueryZSchema, participantZSchema } from '../models/participants';

// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const participantController = new ParticipantController();

router.get('/', validateIds, validateQuery(participantQueryZSchema), participantController.getParticipants);
router.get('/:participantId', validateIds, participantController.getParticipantById);
router.post('/', validateIds, validate(participantZSchema), participantController.createParticipant);
router.put('/:participantId', validateIds, validate(participantZSchema), participantController.updateParticipant);
router.delete('/:participantId', validateIds, participantController.deleteParticipant);

export default router;