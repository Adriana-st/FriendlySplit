import { Request, Response } from 'express';
import { TripService } from '../services/trips';

const tripService = new TripService();

export class TripController {

  getTrips = async (_req: Request, res: Response): Promise<void> => {
    try {
      const trips = await tripService.getAllTrips();
      res.status(200).json(trips);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching trips' });
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
      console.error(error);
      res.status(500).json({ message: 'Error fetching trip' });
    }
  };

  createTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const newTrip = await tripService.createTrip(req.body);
      res.status(201).json(newTrip);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating trip' });
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
      console.error(error);
      res.status(500).json({ message: 'Error updating trip' });
    }
  };

  deleteTrip = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: `dummy response to the delete trip request with trip id ${req.params.tripId}` });
  };

}