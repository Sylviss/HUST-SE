// ./backend/src/controllers/reservationController.js
import * as reservationService from '../services/reservationService.js';

export const createReservationHandler = async (req, res, next) => {
  try {
    // Customer details from req.body, reservation details also from req.body
    const { name, contactPhone, contactEmail, ...reservationData } = req.body;
    const customerDetails = { name, contactPhone, contactEmail };
    const reservation = await reservationService.createReservation(reservationData, customerDetails);
    res.status(201).json(reservation);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not available')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

export const getAllReservationsHandler = async (req, res, next) => {
  try {
    const filters = req.query; // e.g., ?status=PENDING&date=2024-12-25
    const reservations = await reservationService.getAllReservations(filters);
    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

export const getReservationByIdHandler = async (req, res, next) => {
  try {
    const reservation = await reservationService.getReservationById(req.params.reservationId);
    res.status(200).json(reservation);
  } catch (error) {
    if (error.message === 'Reservation not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const confirmReservationHandler = async (req, res, next) => {
  try {
    const staffId = req.staff.id; // From isAuthenticated middleware
    const { tableId } = req.body; // Optional: staff can assign a table during confirmation
    const reservation = await reservationService.confirmReservation(req.params.reservationId, staffId, tableId);
    res.status(200).json(reservation);
  } catch (error) {
    if (error.message === 'Reservation not found' || error.message.includes('Table') || error.message.includes('status')) {
      return res.status(400).json({ message: error.message }); // Or 404 if not found
    }
    next(error);
  }
};

export const cancelReservationHandler = async (req, res, next) => {
  try {
    // TODO: Add logic to check if req.staff (if staff) or customer (if public cancel endpoint) is allowed
    const reservation = await reservationService.cancelReservation(req.params.reservationId);
    res.status(200).json(reservation);
  } catch (error) {
    if (error.message === 'Reservation not found' || error.message.includes('status')) {
      return res.status(400).json({ message: error.message }); // Or 404 if not found
    }
    next(error);
  }
};

export const markAsNoShowHandler = async (req, res, next) => {
  try {
      const staffId = req.staff.id; // From isAuthenticated middleware
      const reservation = await reservationService.markReservationAsNoShow(req.params.reservationId, staffId);
      res.status(200).json(reservation);
  } catch (error) {
      if (error.message.includes('not found') || error.message.includes('status')) {
          return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
      }
      next(error);
  }
};