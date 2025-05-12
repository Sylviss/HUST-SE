// ./backend/src/routes/diningSessionRoutes.js
import express from 'express';
import * as diningSessionController from '../controllers/diningSessionController.js';
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';
import orderRoutesForSession from './orderRoutes.js';
import { billRoutesForSession } from './billingRoutes.js'; // Import session-specific bill routes



const router = express.Router();

// All routes require authentication and appropriate staff role
router.use(isAuthenticated);
// Further role restrictions can be added per route if needed

router.post(
  '/',
  authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
  diningSessionController.startDiningSessionHandler
);

router.get(
  '/',
  authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
  diningSessionController.getAllDiningSessionsHandler
);

router.get(
  '/:sessionId',
  authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
  diningSessionController.getDiningSessionByIdHandler
);

router.patch(
    '/:sessionId/close',
    authorizeRoles(StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER), // Usually Cashier or Manager
    diningSessionController.closeDiningSessionHandler
);

// Nested routes for orders and bills will be added here later
router.use('/:sessionId/orders', orderRoutesForSession);
router.use('/:sessionId/bill', billRoutesForSession);

export default router;