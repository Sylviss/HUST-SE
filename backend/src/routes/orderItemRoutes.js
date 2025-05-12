// ./backend/src/routes/orderItemRoutes.js
import express from 'express';
// Assuming updateOrderItemStatusHandler is in orderController for this example
import { updateOrderItemStatusHandler } from '../controllers/orderController.js';
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

const router = express.Router(); // Not using mergeParams if mounted at top level

router.use(isAuthenticated);

// Update status of a specific order item (e.g., Kitchen marks as 'SOLD_OUT')
router.patch(
  '/:orderItemId/status',
  authorizeRoles(StaffRole.KITCHEN_STAFF, StaffRole.WAITER, StaffRole.MANAGER), // Define who can change item status
  updateOrderItemStatusHandler // Make sure this is imported correctly
);

export default router;