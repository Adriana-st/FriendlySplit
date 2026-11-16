import { Router } from 'express';
import { ParticipantController } from '../controllers/participants';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware';
import { participantParamsZSchema, tripParamsZSchema } from '../models/common';
import { participantQueryZSchema, participantZSchema } from '../models/participants';

// mergeParams lets this router see :tripId from the parent route
const router = Router({ mergeParams: true });
const participantController = new ParticipantController();

router.get('/', validateParams(tripParamsZSchema), validateQuery(participantQueryZSchema), participantController.getParticipants);
router.get('/:participantId', validateParams(participantParamsZSchema), participantController.getParticipantById);
router.post('/', validateParams(tripParamsZSchema), validate(participantZSchema), participantController.createParticipant);
router.put('/:participantId', validateParams(participantParamsZSchema), validate(participantZSchema), participantController.updateParticipant);
router.delete('/:participantId', validateParams(participantParamsZSchema), participantController.deleteParticipant);

export default router;