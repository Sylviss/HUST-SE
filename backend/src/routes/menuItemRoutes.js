// ./backend/src/routes/menuItemRoutes.js
import express from 'express';
import * as menuItemController from '../controllers/menuItemController.js';
import { isAuthenticated, authorizeRoles, isManager } from '../middleware/authMiddleware.js';
import { StaffRole } from '@prisma/client';

const router = express.Router();

router.get(
  '/all-for-admin', // Changed path
  isAuthenticated,
  isManager,
  menuItemController.getAllMenuItemsHandler // This handler needs to know not to filter by isAvailable by default
);


// Public route: Anyone can view available menu items
router.get('/', menuItemController.getAllMenuItemsHandler); // No auth needed for basic GET
                                                        // Could add a separate /admin/menu-items for managers to see all
router.get('/:itemId', menuItemController.getMenuItemByIdHandler); // No auth for specific item GET

// Protected routes: Only Managers can CUD menu items
router.post(
  '/',
  isAuthenticated,
  isManager, // or authorizeRoles(StaffRole.MANAGER)
  menuItemController.createMenuItemHandler
);
router.put(
  '/:itemId',
  isAuthenticated,
  isManager,
  menuItemController.updateMenuItemHandler
);
router.delete(
  '/:itemId',
  isAuthenticated,
  isManager,
  menuItemController.deleteMenuItemHandler
);

router.patch(
  '/:itemId/availability',
  isAuthenticated,
  authorizeRoles(StaffRole.MANAGER, StaffRole.KITCHEN_STAFF), // ADD KITCHEN_STAFF
  menuItemController.updateMenuItemAvailabilityHandler
);

export default router;