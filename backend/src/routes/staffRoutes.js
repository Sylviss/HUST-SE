// ./backend/src/routes/staffRoutes.js
import express from 'express';
import * as staffController from '../controllers/staffController.js';
import { isAuthenticated, isManager } from '../middleware/authMiddleware.js'; // Use isManager for all

const router = express.Router();

// All staff management routes are protected and for Managers only
router.use(isAuthenticated, isManager);

router.post('/', staffController.createStaffHandler);
router.get('/', staffController.getAllStaffHandler);
router.get('/:staffId', staffController.getStaffByIdHandler);
router.put('/:staffId', staffController.updateStaffHandler); // For general updates like name, role
router.patch('/:staffId/status', staffController.toggleStaffActiveStatusHandler); // For activate/deactivate

export default router;