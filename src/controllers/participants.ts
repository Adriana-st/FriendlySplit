import { Request, Response } from 'express';
import { ParticipantService } from '../services/participants';
import { ParticipantQuery } from '../models/participants';
import { handleError } from '../utils/errors';
import { listResponse } from '../utils/helpers';

const participantService = new ParticipantService();

export class ParticipantController {

  getParticipants = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = res.locals.query as ParticipantQuery;
      const { participants, total } = await participantService.getParticipants(req.params.tripId as string, query);
      res.status(200).json(listResponse(participants, query.page, query.limit, total));
    } catch (error) {
      handleError(res, error, 'Error fetching participants');
    }
  };

  getParticipantById = async (req: Request, res: Response): Promise<void> => {
    try {
      const participant = await participantService.getParticipantById(req.params.tripId as string, req.params.participantId as string);
      if (!participant) {
        res.status(404).json({ message: 'Participant not found' });
        return;
      }
      res.status(200).json(participant);
    } catch (error) {
      handleError(res, error, 'Error fetching participant');
    }
  };

  createParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const tripId = req.params.tripId as string;
      const newParticipant = await participantService.createParticipant(tripId, req.body);
      res.status(201).location(`/api/v1/trips/${tripId}/participants/${newParticipant._id}`).json(newParticipant);
    } catch (error) {
      handleError(res, error, 'Error creating participant');
    }
  };

  updateParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const updatedParticipant = await participantService.updateParticipant(
        req.params.tripId as string,
        req.params.participantId as string,
        req.body
      );
      if (!updatedParticipant) {
        res.status(404).json({ message: 'Participant not found' });
        return;
      }
      res.status(200).json(updatedParticipant);
    } catch (error) {
      handleError(res, error, 'Error updating participant');
    }
  };

  deleteParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedParticipant = await participantService.deleteParticipant(
        req.params.tripId as string,
        req.params.participantId as string
      );
      if (!deletedParticipant) {
        res.status(404).json({ message: 'Participant not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Error deleting participant');
    }
  };

}