// ./backend/src/routes/orderRoutes.js
import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

// This router will be mounted under /api/v1/dining-sessions/:sessionId/orders
// OR under /api/v1/orders for general order management
const router = express.Router({ mergeParams: true }); // mergeParams allows access to :sessionId

router.use(isAuthenticated); // All order routes require authentication

// Create an order for a specific dining session
router.post(
  '/',
  authorizeRoles(StaffRole.WAITER, StaffRole.MANAGER, StaffRole.CASHIER), // Who can take orders
  orderController.createOrderHandler
);

// Get all orders
router.get(
  '/',
  authorizeRoles(StaffRole.WAITER, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.KITCHEN_STAFF),
  orderController.getAllOrdersHandler
);

// Routes for individual orders (might also be accessed directly via /api/v1/orders/:orderId)
router.get(
  '/:orderId',
  authorizeRoles(StaffRole.WAITER, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.KITCHEN_STAFF),
  orderController.getOrderByIdHandler
);

router.patch(
  '/:orderId/status',
  authorizeRoles(StaffRole.WAITER, StaffRole.MANAGER, StaffRole.KITCHEN_STAFF, StaffRole.CASHIER), // Various roles can update status
  orderController.updateOrderStatusHandler
);

export default router;