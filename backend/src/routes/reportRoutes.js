// ./backend/src/routes/reportRoutes.js
import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { isAuthenticated, isManager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(isAuthenticated, isManager); // Protect all report routes for Managers only

router.get('/revenue', reportController.getRevenueReportHandler);
router.get('/popular-items', reportController.getPopularItemsReportHandler);
// Add more report routes here

export default router;