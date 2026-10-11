import { Request, Response } from 'express';
import { ParticipantService } from '../services/participants';
import { ParticipantQuery } from '../models/participants';
import { handleError } from '../utils/errors';
import { listResponse } from '../utils/helpers';

const participantService = new ParticipantService();

export class ParticipantController {

    /**
     * @openapi
     * /trips/{tripId}/participants:
     *   get:
     *     summary: List the participants of a trip
     *     tags:
     *       - Participants
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - in: query
     *         name: name
     *         description: Partial, case-insensitive match on the name
     *         schema:
     *           type: string
     *           maxLength: 60
     *       - in: query
     *         name: sort
     *         schema:
     *           type: string
     *           enum: [name, -name, createdAt, -createdAt]
     *           default: name
     *       - in: query
     *         name: fields
     *         description: Comma separated list of fields to return (projection)
     *         schema:
     *           type: string
     *         example: name,email
     *       - $ref: '#/components/parameters/Page'
     *       - $ref: '#/components/parameters/Limit'
     *     responses:
     *       200:
     *         description: A page of participants
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Participant'
     *                 meta:
     *                   $ref: '#/components/schemas/ListMeta'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
    getParticipants = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = res.locals.query as ParticipantQuery;
            const { participants, total } = await participantService.getParticipants(req.params.tripId as string, query);
            res.status(200).json(listResponse(participants, query.page, query.limit, total));
        } catch (error) {
            handleError(res, error, 'Error fetching participants');
        }
    };

    /**
     * @openapi
     * /trips/{tripId}/participants/{participantId}:
     *   get:
     *     summary: Get one participant
     *     tags:
     *       - Participants
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ParticipantId'
     *     responses:
     *       200:
     *         description: The participant
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Participant'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         description: Internal server error
     */
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

    /**
     * @openapi
     * /trips/{tripId}/participants:
     *   post:
     *     summary: Add a participant to a trip
     *     tags:
     *       - Participants
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ParticipantInput'
     *     responses:
     *       201:
     *         description: Participant added
     *         headers:
     *           Location:
     *             schema:
     *               type: string
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Participant'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       409:
     *         $ref: '#/components/responses/Conflict'
     *       500:
     *         description: Internal server error
     */
    createParticipant = async (req: Request, res: Response): Promise<void> => {
        try {
            const tripId = req.params.tripId as string;
            const newParticipant = await participantService.createParticipant(tripId, req.body);
            res.status(201).location(`/api/v1/trips/${tripId}/participants/${newParticipant._id}`).json(newParticipant);
        } catch (error) {
            handleError(res, error, 'Error creating participant');
        }
    };

    /**
     * @openapi
     * /trips/{tripId}/participants/{participantId}:
     *   put:
     *     summary: Replace a participant
     *     tags:
     *       - Participants
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ParticipantId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ParticipantInput'
     *     responses:
     *       200:
     *         description: The updated participant
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Participant'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       409:
     *         $ref: '#/components/responses/Conflict'
     *       500:
     *         description: Internal server error
     */
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

    /**
     * @openapi
     * /trips/{tripId}/participants/{participantId}:
     *   delete:
     *     summary: Remove a participant
     *     description: Fails with 409 if the participant paid for, or shares in, any expense.
     *     tags:
     *       - Participants
     *     parameters:
     *       - $ref: '#/components/parameters/TripId'
     *       - $ref: '#/components/parameters/ParticipantId'
     *     responses:
     *       204:
     *         description: Participant removed (no content)
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       409:
     *         $ref: '#/components/responses/Conflict'
     *       500:
     *         description: Internal server error
     */
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