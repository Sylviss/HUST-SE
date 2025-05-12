// ./backend/src/controllers/orderController.js
import * as orderService from '../services/orderService.js';
// No changes needed for createOrderHandler, getOrderByIdHandler, getAllOrdersHandler from before,
// as their service calls already return fully populated objects.

export const createOrderHandler = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const orderData = req.body; // Expects { items: [...], notes: "..." }
        const staffId = req.staff.id;

        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ message: 'Order items are required.' });
        }

        const order = await orderService.createOrderForSession(sessionId, orderData, staffId);
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
        const filters = { ...req.query };
        if (req.params.sessionId) {
        filters.diningSessionId = req.params.sessionId;
        }
        const orders = await orderService.getAllOrders(filters);
        res.status(200).json(orders);
    } catch (error) {
        next(error);
    }
};

// REVISED updateOrderStatusHandler
export const updateOrderStatusHandler = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const staffId = req.staff.id; // Assuming staff making the change is relevant

    if (!status) {
      return res.status(400).json({ message: 'New status is required.' });
    }
    const order = await orderService.updateOrderStatus(orderId, status, staffId);
    res.status(200).json(order);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid order status') || error.message.includes('Invalid status transition')) {
      return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
    }
    next(error);
  }
};

// Handler for updating a specific OrderItem's status (e.g., for SOLD_OUT)
// This could also live in an OrderItemController if you have one.
export const updateOrderItemStatusHandler = async (req, res, next) => {
    try {
        const { orderItemId } = req.params;
        const { status, reason } = req.body;
        const staffId = req.staff.id;

        if(!status) {
            return res.status(400).json({ message: 'New item status is required.'});
        }
        // The service now returns the full parent order after item status update & sync
        const updatedParentOrder = await orderService.updateOrderItemStatus(orderItemId, status, reason, staffId);
        res.status(200).json(updatedParentOrder);
    } catch (error) {
         if (error.message.includes('not found') || error.message.includes('Invalid order item status') || error.message.includes('Invalid item status transition')) {
            return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
        }
        next(error);
    }
};

// NEW HANDLER for resolving ACTION_REQUIRED orders
export const resolveActionRequiredOrderHandler = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const resolutionData = req.body; // Expects { itemsToCancelIds?, itemsToUpdate?, itemsToAdd? }
        const staffId = req.staff.id;

        const updatedOrder = await orderService.resolveActionRequiredOrder(orderId, resolutionData, staffId);
        res.status(200).json(updatedOrder);
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('not in ACTION_REQUIRED state') || error.message.includes('not available for reorder') || error.message.includes('must be positive')) {
            return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
        }
        next(error);
    }
};