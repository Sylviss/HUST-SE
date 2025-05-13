// ./backend/src/routes/reservationRoutes.js
import express from 'express';
import * as reservationController from '../controllers/reservationController.js';
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

const router = express.Router();

// Public: Customer creates a reservation request
router.post('/', reservationController.createReservationHandler);

// Staff Only Routes
router.get(
  '/',
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER),
  reservationController.getAllReservationsHandler
);

router.get(
  '/:reservationId',
  isAuthenticated, // Or a public way for customers to view their own reservation
  authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER), // TODO: Customer access logic
  reservationController.getReservationByIdHandler
);

router.patch(
  '/:reservationId/confirm',
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER),
  reservationController.confirmReservationHandler
);

router.patch(
  '/:reservationId/cancel',
  isAuthenticated, // Staff can cancel
  authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER), // TODO: Customer access logic
  reservationController.cancelReservationHandler
);

router.patch(
  '/:reservationId/no-show', // New route
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER), // Define who can mark no-show
  reservationController.markAsNoShowHandler
);

// Other routes for seating, etc. can be added here or in a dining_session controller

export default router;