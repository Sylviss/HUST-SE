// ./backend/src/routes/tableRoutes.js
import express from 'express';
import * as tableController from '../controllers/tableController.js';
import { isAuthenticated, authorizeRoles, isManager } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

const router = express.Router();

// Authenticated Staff can view tables
router.get(
  '/',
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
  tableController.getAllTablesHandler
);
router.get(
  '/:tableId',
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
  tableController.getTableByIdHandler
);

// Only Managers can create, update, delete tables
router.post(
  '/',
  isAuthenticated,
  isManager,
  tableController.createTableHandler
);
router.put(
  '/:tableId',
  isAuthenticated,
  isManager,
  tableController.updateTableHandler
);
router.delete(
  '/:tableId',
  isAuthenticated,
  isManager,
  tableController.deleteTableHandler
);

// Updating status might be done by Waiters or Managers (e.g., marking 'Needs Cleaning')
router.patch(
    '/:tableId/status',
    isAuthenticated,
    authorizeRoles(StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER),
    tableController.updateTableStatusHandler
);

export default router;