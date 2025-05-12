// ./backend/src/controllers/diningSessionController.js
import * as diningSessionService from '../services/diningSessionService.js';

export const startDiningSessionHandler = async (req, res, next) => {
  try {
    const staffId = req.staff.id; // From isAuthenticated middleware
    const session = await diningSessionService.startDiningSession(req.body, staffId);
    res.status(201).json(session);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not available') || error.message.includes('capacity') || error.message.includes('Reservation must be CONFIRMED') || error.message.includes('linked to an active')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const getAllDiningSessionsHandler = async (req, res, next) => {
  try {
    const filters = req.query; // e.g., ?status=ACTIVE&tableId=some-uuid
    const sessions = await diningSessionService.getAllDiningSessions(filters);
    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
};

export const getDiningSessionByIdHandler = async (req, res, next) => {
  try {
    const session = await diningSessionService.getDiningSessionById(req.params.sessionId);
    res.status(200).json(session);
  } catch (error) {
    if (error.message === 'Dining session not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const closeDiningSessionHandler = async (req, res, next) => {
    try {
        const staffId = req.staff.id;
        const session = await diningSessionService.closeDiningSession(req.params.sessionId, staffId);
        res.status(200).json(session);
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('status to be closed')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};