// ./backend/src/controllers/orderController.js
import * as orderService from '../services/orderService.js';

export const createOrderHandler = async (req, res, next) => {
  try {
    const { sessionId } = req.params; // Assuming sessionId is in URL
    const itemsData = req.body.items; // e.g. [{ menuItemId, quantity, specialRequests }, ...]
    const staffId = req.staff.id; // From isAuthenticated middleware

    if (!itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      return res.status(400).json({ message: 'Order items are required.' });
    }

    const order = await orderService.createOrderForSession(sessionId, itemsData, staffId);
    res.status(201).json(order);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not found') || error.message.includes('Invalid quantity') || error.message.includes('unavailable') || error.message.includes('session with status')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

export const getOrderByIdHandler = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    res.status(200).json(order);
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const getAllOrdersHandler = async (req, res, next) => {
  try {
    const filters = req.query; // e.g., { status: 'PENDING,PREPARING' }
    const orders = await orderService.getAllOrders(filters); // Uses the service function we fixed
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatusHandler = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const staffId = req.staff.id;

    if (!status) {
      return res.status(400).json({ message: 'New status is required.' });
    }
    const order = await orderService.updateOrderStatus(orderId, status, staffId);
    res.status(200).json(order);
  } catch (error) {
    if (error.message === 'Order not found' || error.message.includes('Invalid order status')) {
      return res.status(400).json({ message: error.message }); // Or 404
    }
    next(error);
  }
};

export const updateOrderItemStatusHandler = async (req, res, next) => {
    try {
        const { orderItemId } = req.params;
        const { status, reason } = req.body;
        const staffId = req.staff.id;

        if(!status) {
            return res.status(400).json({ message: 'New item status is required.'});
        }
        const item = await orderService.updateOrderItemStatus(orderItemId, status, reason, staffId);
        res.status(200).json(item);
    } catch (error) {
         if (error.message.includes('not found') || error.message.includes('Invalid order item status')) {
            return res.status(400).json({ message: error.message }); // Or 404
        }
        next(error);
    }
};