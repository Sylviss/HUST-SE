// ./backend/src/routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
import menuItemRoutes from './menuItemRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import tableRoutes from './tableRoutes.js';
import diningSessionRoutes from './diningSessionRoutes.js';
import orderRoutes from './orderRoutes.js'; // For general access like /orders/:orderId
import orderItemRoutes from './orderItemRoutes.js'; // For /order-items/:orderItemId
import { billRoutes } from './billingRoutes.js'; // Import direct bill routes
import reportRoutes from './reportRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/reservations', reservationRoutes);
router.use('/tables', tableRoutes);
router.use('/dining-sessions', diningSessionRoutes); // This already includes nested /:sessionId/orders
router.use('/orders', orderRoutes); // For direct access to an order by its ID, e.g., GET /api/v1/orders/:orderId
router.use('/order-items', orderItemRoutes); // For direct access to an order item by its 
router.use('/bills', billRoutes); // Add direct bill routes
router.use('/reports', reportRoutes);



export default router;