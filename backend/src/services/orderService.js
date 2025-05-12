// ./backend/src/services/orderService.js
import prisma from '../db/prismaClient.js';
import { OrderStatus, OrderItemStatus, DiningSessionStatus} from '@prisma/client';

const validOrderStatusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.ACTION_REQUIRED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.ACTION_REQUIRED], // Or back to PENDING if kitchen rejects
  [OrderStatus.ACTION_REQUIRED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED], // If items resolved
  [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED], // Cannot go back to preparing easily once fully ready
  [OrderStatus.SERVED]: [], // Terminal state for active flow, only CANCELLED if error/void
  [OrderStatus.CANCELLED]: [], // Terminal state
};


const validOrderItemStatusTransitions = {
  [OrderItemStatus.PENDING]: [OrderItemStatus.PREPARING, OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT],
  [OrderItemStatus.PREPARING]: [OrderItemStatus.READY, OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT],
  [OrderItemStatus.SOLD_OUT]: [OrderItemStatus.CANCELLED], // If customer wants to remove it
  [OrderItemStatus.READY]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.SERVED]: [],
  [OrderItemStatus.CANCELLED]: [],
};

export const syncOrderStatusBasedOnItems = async (orderId, txClient = prisma) => {
  const order = await txClient.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { status: true } } }
  });

  if (!order || !order.items.length) return null; // Or handle as error

  const itemStatuses = order.items.map(item => item.status);

  let newOrderStatus = order.status;

  if (itemStatuses.every(s => s === OrderItemStatus.CANCELLED)) {
      newOrderStatus = OrderStatus.CANCELLED;
  } else if (itemStatuses.some(s => s === OrderItemStatus.SOLD_OUT)) {
      newOrderStatus = OrderStatus.ACTION_REQUIRED;
  } else if (itemStatuses.every(s => s === OrderItemStatus.SERVED || s === OrderItemStatus.CANCELLED)) {
      newOrderStatus = OrderStatus.SERVED;
  } else if (itemStatuses.every(s => s === OrderItemStatus.READY || s === OrderItemStatus.SERVED || s === OrderItemStatus.CANCELLED)) {
      newOrderStatus = OrderStatus.READY;
  } else if (itemStatuses.some(s => s === OrderItemStatus.PREPARING || s === OrderItemStatus.READY || s === OrderItemStatus.SERVED)) {
      if(order.status === OrderStatus.PENDING) newOrderStatus = OrderStatus.PREPARING; // Move to preparing if any item is
  }
  // If it was ACTION_REQUIRED and all SOLD_OUT are now CANCELLED, re-evaluate
  else if (order.status === OrderStatus.ACTION_REQUIRED && !itemStatuses.some(s => s === OrderItemStatus.SOLD_OUT)) {
     // Re-evaluate based on remaining PENDING/PREPARING/READY/SERVED items
     // This part can get complex, might need to check if all remaining items are PENDING to go back to PENDING, etc.
     // For simplicity now, if no SOLD_OUT, and not all SERVED/READY, assume PREPARING or PENDING based on items.
     if (itemStatuses.every(s => s === OrderItemStatus.PENDING || s === OrderItemStatus.CANCELLED)) {
         newOrderStatus = OrderStatus.PENDING;
     } else {
         newOrderStatus = OrderStatus.PREPARING; // Default to PREPARING if mix
     }
  }


  if (newOrderStatus !== order.status) {
    return txClient.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
        include: { // <<< ENSURE THIS INCLUDE IS HERE
            items: { include: { menuItem: { select: { id: true, name: true, price: true } } }, orderBy: {createdAt: 'asc'} },
            takenBy: { select: { id: true, name: true } },
            diningSession: { include: { table: { select: { id: true, tableNumber: true } } } }
        }
    });
}
// If no status change, refetch the order with full includes to be consistent
return txClient.order.findUnique({
    where: {id: orderId},
    include: {
        items: { include: { menuItem: { select: { id: true, name: true, price: true } } }, orderBy: {createdAt: 'asc'} },
        takenBy: { select: { id: true, name: true } },
        diningSession: { include: { table: { select: { id: true, tableNumber: true } } } }
    }
});
};



export const createOrderForSession = async (sessionId, itemsData, staffId) => {
  if (!itemsData || itemsData.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  // Start a transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    const diningSession = await tx.diningSession.findUnique({
      where: { id: sessionId },
    });

    if (!diningSession) {
      throw new Error('Dining session not found.');
    }
    if (diningSession.status !== DiningSessionStatus.ACTIVE) {
      throw new Error(`Cannot add order to session with status: ${diningSession.status}`);
    }

    // Fetch all menu items at once to validate and get current prices
    const menuItemIds = itemsData.map(item => item.menuItemId);
    const menuItemsDb = await tx.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        isAvailable: true, // Only allow ordering available items
      },
    });

    // Create a map for easy lookup
    const menuItemMap = new Map(menuItemsDb.map(item => [item.id, item]));

    // Validate items and prepare order item data
    const orderItemsToCreate = itemsData.map(itemInput => {
      const menuItem = menuItemMap.get(itemInput.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item with ID ${itemInput.menuItemId} not found or is unavailable.`);
      }
      if (!itemInput.quantity || itemInput.quantity <= 0) {
        throw new Error(`Invalid quantity for menu item: ${menuItem.name}`);
      }
      return {
        menuItemId: menuItem.id,
        quantity: itemInput.quantity,
        priceAtOrderTime: menuItem.price, // Store current price
        specialRequests: itemInput.specialRequests || null,
        status: OrderItemStatus.PENDING, // Initial status for each item
      };
    });

    // Create the Order
    const newOrder = await tx.order.create({
      data: {
        diningSessionId: sessionId,
        staffIdTakenBy: staffId,
        status: OrderStatus.PENDING, // Initial order status
        notes: itemsData.notes || null,
        items: {
          create: orderItemsToCreate.map(item => ({...item, status: OrderItemStatus.PENDING})), // Ensure item status
        },
      },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, price: true } } } },
        takenBy: { select: { id: true, name: true } },
        diningSession: { select: { id: true, table: { select: { tableNumber: true } } } },
      },
    });

    return newOrder;
  });
};

export const getOrderById = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: true } },
      takenBy: { select: { id: true, name: true } },
      diningSession: { include: { table: true } },
    },
  });
  if (!order) throw new Error('Order not found');
  return order;
};

export const getAllOrders = async (filters = {}) => {
  const whereClause = {};
  if (filters.status) {
    const statuses = filters.status.split(',')
                          .map(s => s.trim().toUpperCase())
                          .filter(s => Object.values(OrderStatus).includes(s));
    if (statuses.length > 0) {
      whereClause.status = { in: statuses };
    }
  }
  if (filters.diningSessionId) { // If filtering by session ID directly
    whereClause.diningSessionId = filters.diningSessionId;
  }
  // Add other filters like date range if needed for kitchen view

  return prisma.order.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          menuItem: { select: { id: true, name: true, price: true } } // Select specific menuItem fields
        },
        orderBy: { createdAt: 'asc' } // Order items within an order
      },
      takenBy: { select: { id: true, name: true } },
      // CRITICAL CHANGE: Include diningSession and its related table
      diningSession: {
        include: {
          table: { select: { id: true, tableNumber: true } } // Select specific table fields
        }
      }
    },
    orderBy: { orderTime: 'asc' } // Order the main list of orders
  });
};

export const updateOrderStatus = async (orderId, newStatus, staffId) => {
  if (!Object.values(OrderStatus).includes(newStatus)) {
    throw new Error(`Invalid order status: ${newStatus}`);
  }
  const order = await prisma.order.findUnique({ where: { id: orderId }});
  if (!order) throw new Error('Order not found.');

  const allowedTransitions = validOrderStatusTransitions[order.status] || [];
  if (!allowedTransitions.includes(newStatus) && order.status !== newStatus) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}.`);
  }

  // If staff is marking Order as SERVED or READY, all items should also be marked.
  // This can be complex: either enforce it here, or assume UI/workflow handles item statuses first.
  // For now, we update the order status directly. A more robust system might:
  // 1. Iterate items and update their status to SERVED/READY if not already CANCELLED.
  // 2. Then update the order status.
  if (newStatus === OrderStatus.SERVED || newStatus === OrderStatus.READY) {
    // A simplified approach for now. A real system might ensure item statuses are compatible.
    console.warn(`Order ${orderId} marked as ${newStatus}. Ensure all items are appropriately updated.`);
  }


  return prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
    include: {
      items: {
        include: {
          menuItem: { select: { id: true, name: true, price: true } }
        },
        orderBy: { createdAt: 'asc' }
      },
      takenBy: { select: { id: true, name: true } },
      diningSession: {
        include: {
          table: { select: { id: true, tableNumber: true } }
        }
      }
    },
  });
};


export const updateOrderItemStatus = async (orderItemId, newStatus, reason = null, staffId) => {
  if (!Object.values(OrderItemStatus).includes(newStatus)) {
    throw new Error(`Invalid order item status: ${newStatus}`);
  }
  const orderItem = await prisma.orderItem.findUnique({
    where: {id: orderItemId},
    include: { order: true }
  });
  if(!orderItem) throw new Error('Order item not found.');

  const allowedTransitions = validOrderItemStatusTransitions[orderItem.status] || [];
   if (!allowedTransitions.includes(newStatus) && orderItem.status !== newStatus) {
      throw new Error(`Invalid item status transition from ${orderItem.status} to ${newStatus}.`);
  }

  const updatedItem = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status: newStatus /*, reasonForStatus: reason */ },
    include: { // Return the menuItem for context in UI updates
        menuItem: { select: {id: true, name: true, price: true} }
    }
});

// IMPORTANT: syncOrderStatusBasedOnItems should ideally return the FULL order object
// with all necessary includes if the order status actually changes.
// Or, the frontend thunk for updateOrderItemStatus should refetch the parent order
// if the parent order's status might have changed.
// For now, let's assume syncOrderStatusBasedOnItems might just return the updated order object.
const updatedOrder = await syncOrderStatusBasedOnItems(orderItem.orderId);

// If syncOrderStatusBasedOnItems doesn't return the full order with all includes,
// the frontend reducer for updateOrderItemStatus.fulfilled might need to just update
// the item and then trigger a re-fetch of the parent order for full consistency.
// Alternatively, the backend here could return both updatedItem and the potentially updated parentOrder (fully populated).
// Let's assume for now the frontend primarily cares about the item update from this specific thunk.
// The updateOrderStatus.fulfilled reducer in Redux is responsible for the full order object.

return updatedItem; // This only returns the item.
                    // Consider returning the full parent order if its status changes.
};


