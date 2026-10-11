import { Request, Response } from 'express';

export class TripController {

  getTrips = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: "dummy response to the get all trips request" });
  };

  getTripById = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: `dummy response to the get trip by id request with trip id ${req.params.tripId}` });
  };

  createTrip = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: `dummy response to the create trip request, the body is: ${JSON.stringify(req.body)}` });
  };

  updateTrip = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: `dummy response to the update trip request with trip id ${req.params.tripId}` });
  };

  deleteTrip = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true,
      data: `dummy response to the delete trip request with trip id ${req.params.tripId}` });
  };

}