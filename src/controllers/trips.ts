import { Request, Response } from 'express';
import { TripService } from '../services/trips';
import { handleError } from '../utils/errors';

const tripService = new TripService();

export class TripController {

  getTrips = async (_req: Request, res: Response): Promise<void> => {
    try {
      const trips = await tripService.getAllTrips();
      res.status(200).json(trips);
    } catch (error) {
      handleError(res, error, 'Error fetching trips');
    }
  };

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

  createTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const newTrip = await tripService.createTrip(req.body);
      res.status(201).location(`/api/v1/trips/${newTrip._id}`).json(newTrip);
    } catch (error) {
      handleError(res, error, 'Error creating trip');
    }
  };

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