// ./backend/src/routes/orderItemRoutes.js
import express from 'express';
import * as orderController from '../controllers/orderController.js'; // Reusing updateOrderItemStatusHandler
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

const router = express.Router();

router.use(isAuthenticated);

// Update status of a specific order item (e.g., Kitchen marks as 'SOLD_OUT')
router.patch(
  '/:orderItemId/status',
  authorizeRoles(StaffRole.KITCHEN_STAFF, StaffRole.WAITER, StaffRole.MANAGER),
  orderController.updateOrderItemStatusHandler
);

export default router;