// ./backend/src/routes/billingRoutes.js
import express from 'express';
import * as billingController from '../controllers/billingController.js';
import { isAuthenticated, authorizeRoles } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

// This router will be mounted under /api/v1/dining-sessions/:sessionId/bill
// AND under /api/v1/bills for general bill management
const router = express.Router({ mergeParams: true }); // mergeParams for :sessionId

router.use(isAuthenticated);
// Assuming Cashier, Waiter, Manager can generate/view/confirm payment
const allowedRolesForBilling = [StaffRole.CASHIER, StaffRole.WAITER, StaffRole.MANAGER];

// Generate or Get Bill for a specific dining session
router.route('/') // Corresponds to /api/v1/dining-sessions/:sessionId/bill
  .post(authorizeRoles(...allowedRolesForBilling), billingController.generateBillHandler)
  .get(authorizeRoles(...allowedRolesForBilling), billingController.getBillBySessionIdHandler);

// Confirm payment for a specific bill (using billId directly)
// This will be mounted under /api/v1/bills/:billId/pay
// So we define it in a separate router or structure it carefully.

// For now, let's assume direct /bills access:
const directBillRouter = express.Router();
directBillRouter.use(isAuthenticated);

directBillRouter.get(
    '/:billId',
    authorizeRoles(...allowedRolesForBilling),
    billingController.getBillByIdHandler
);
directBillRouter.patch(
    '/:billId/pay',
    authorizeRoles(...allowedRolesForBilling),
    billingController.confirmPaymentHandler
);

// Export both. The session-specific one will be nested.
export { router as billRoutesForSession, directBillRouter as billRoutes };