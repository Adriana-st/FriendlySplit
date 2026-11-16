import { Request, Response } from 'express';
import { TripService } from '../services/trips';
import { handleError } from '../utils/errors';
import { TripQuery } from '../models/trips';
import { listResponse } from '../utils/helpers';

const tripService = new TripService();

export class TripController {

  /**
   * @openapi
   * /trips:
   *   get:
   *     summary: List trips (filter, sort, project and page)
   *     tags:
   *       - Trips
   *     parameters:
   *       - in: query
   *         name: destination
   *         description: Partial, case-insensitive match on the destination
   *         schema:
   *           type: string
   *           maxLength: 80
   *         example: lis
   *       - in: query
   *         name: currency
   *         description: Three letter currency code
   *         schema:
   *           type: string
   *           minLength: 3
   *           maxLength: 3
   *         example: EUR
   *       - in: query
   *         name: startsAfter
   *         description: Only trips starting on or after this date
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: startsBefore
   *         description: Only trips starting on or before this date
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: sort
   *         description: Field to sort by. Prefix with a minus sign for descending.
   *         schema:
   *           type: string
   *           enum: [startDate, -startDate, name, -name, createdAt, -createdAt]
   *           default: -startDate
   *       - in: query
   *         name: fields
   *         description: Comma separated list of fields to return (projection). _id is always returned.
   *         schema:
   *           type: string
   *         example: name,currency
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *     responses:
   *       200:
   *         description: A page of trips
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Trip'
   *                 meta:
   *                   $ref: '#/components/schemas/ListMeta'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         description: Internal server error
   */
  getTrips = async (_req: Request, res: Response): Promise<void> => {
    try {
      const query = res.locals.query as TripQuery;
      const { trips, total } = await tripService.getAllTrips(query);
      res.status(200).json(listResponse(trips, query.page, query.limit, total));
    } catch (error) {
      handleError(res, error, 'Error fetching trips');
    }
  };

  /**
   * @openapi
   * /trips/{tripId}:
   *   get:
   *     summary: Get one trip
   *     tags:
   *       - Trips
   *     parameters:
   *       - $ref: '#/components/parameters/TripId'
   *     responses:
   *       200:
   *         description: The trip
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Trip'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         description: Internal server error
   */
  getTripById = async (req: Request, res: Response): Promise<void> => {
    try {
      const trip = await tripService.getTripById(req.params.tripId as string);
      if (!trip) {
        res.status(404).json({ message: 'Trip not found' });
        return;
      }
      res.status(200).json(trip);
    } catch (error) {
      handleError(res, error, 'Error fetching trip');
    }
  };

  /**
   * @openapi
   * /trips:
   *   post:
   *     summary: Create a trip
   *     tags:
   *       - Trips
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TripInput'
   *     responses:
   *       201:
   *         description: Trip created
   *         headers:
   *           Location:
   *             description: URL of the new trip
   *             schema:
   *               type: string
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Trip'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         description: Internal server error
   */
  createTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const newTrip = await tripService.createTrip(req.body);
      res.status(201).location(`/api/v1/trips/${newTrip._id}`).json(newTrip);
    } catch (error) {
      handleError(res, error, 'Error creating trip');
    }
  };

  /**
   * @openapi
   * /trips/{tripId}:
   *   put:
   *     summary: Replace a trip
   *     description: Fails with 422 if the new dates would leave any existing expense outside the trip.
   *     tags:
   *       - Trips
   *     parameters:
   *       - $ref: '#/components/parameters/TripId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TripInput'
   *     responses:
   *       200:
   *         description: The updated trip
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Trip'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       422:
   *         $ref: '#/components/responses/Unprocessable'
   *       500:
   *         description: Internal server error
   */
  updateTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const updatedTrip = await tripService.updateTrip(req.params.tripId as string, req.body);
      if (!updatedTrip) {
        res.status(404).json({ message: 'Trip not found' });
        return;
      }
      res.status(200).json(updatedTrip);
    } catch (error) {
      handleError(res, error, 'Error updating trip');
    }
  };

  /**
   * @openapi
   * /trips/{tripId}:
   *   delete:
   *     summary: Delete a trip
   *     description: Also deletes all of the trip's participants and expenses.
   *     tags:
   *       - Trips
   *     parameters:
   *       - $ref: '#/components/parameters/TripId'
   *     responses:
   *       204:
   *         description: Trip deleted (no content)
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         description: Internal server error
   */
  deleteTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedTrip = await tripService.deleteTrip(req.params.tripId as string);
      if (!deletedTrip) {
        res.status(404).json({ message: 'Trip not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Error deleting trip');
    }
  };

}