// ./backend/src/services/orderService.js
import prisma from '../db/prismaClient.js';
import { OrderStatus, OrderItemStatus, DiningSessionStatus, StaffRole, TableStatus } from '@prisma/client'; // Ensure all enums used are imported

// Define once for consistent responses, especially for includes
const FULL_ORDER_INCLUDES = {
  items: {
    include: { menuItem: { select: { id: true, name: true, price: true, isAvailable: true } } },
    orderBy: { createdAt: 'asc' }
  },
  takenBy: { select: { id: true, name: true, role: true } },
  diningSession: {
    include: {
      table: { select: { id: true, tableNumber: true } }
    }
  }
};

// --- Helper: Valid Status Transitions (adjust as per your exact business rules) ---
const validOrderStatusTransitions = {
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.ACTION_REQUIRED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.ACTION_REQUIRED],
    [OrderStatus.ACTION_REQUIRED]: [OrderStatus.PREPARING, OrderStatus.PENDING, OrderStatus.CANCELLED], // After waiter fixes it
    [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
    [OrderStatus.SERVED]: [OrderStatus.CANCELLED], // Allow cancellation of served for void/correction
    [OrderStatus.CANCELLED]: [],
};

const validOrderItemStatusTransitions = {
    [OrderItemStatus.PENDING]: [OrderItemStatus.PREPARING, OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT],
    [OrderItemStatus.PREPARING]: [OrderItemStatus.READY, OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT],
    [OrderItemStatus.SOLD_OUT]: [OrderItemStatus.CANCELLED], // Waiter can cancel a sold out item
    [OrderItemStatus.READY]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELLED],
    [OrderItemStatus.SERVED]: [OrderItemStatus.CANCELLED], // Allow cancellation for void/correction
    [OrderItemStatus.CANCELLED]: [],
};

// --- Helper: Function to synchronize order status based on its items ---
export const syncOrderStatusBasedOnItems = async (orderId, txClient = prisma) => {
    const currentOrder = await txClient.order.findUnique({
        where: { id: orderId },
        include: { items: { select: { status: true, id: true } } }
    });

    if (!currentOrder) {
        console.warn(`syncOrderStatus: Order ${orderId} not found during sync.`);
        return null;
    }
    if (!currentOrder.items) {
        console.warn(`syncOrderStatus: Order ${orderId} has no items field. Current status: ${currentOrder.status}`);
        return txClient.order.findUnique({ where: {id: orderId}, include: FULL_ORDER_INCLUDES });
    }

    let newOrderStatus = currentOrder.status;
    const activeItems = currentOrder.items.filter(item => item.status !== OrderItemStatus.CANCELLED);
    const itemStatuses = activeItems.map(item => item.status);


    if (activeItems.length === 0 && currentOrder.status !== OrderStatus.CANCELLED) {
        newOrderStatus = OrderStatus.CANCELLED;
    } else if (itemStatuses.some(s => s === OrderItemStatus.SOLD_OUT)) {
        newOrderStatus = OrderStatus.ACTION_REQUIRED;
    } else if (itemStatuses.length > 0 && itemStatuses.every(s => s === OrderItemStatus.SERVED)) {
        newOrderStatus = OrderStatus.SERVED;
    } else if (itemStatuses.length > 0 && itemStatuses.every(s => s === OrderItemStatus.READY || s === OrderItemStatus.SERVED)) {
        newOrderStatus = OrderStatus.READY;
    } else if (itemStatuses.some(s => s === OrderItemStatus.PREPARING || s === OrderItemStatus.READY || s === OrderItemStatus.SERVED)) {
        if (currentOrder.status === OrderStatus.PENDING || currentOrder.status === OrderStatus.ACTION_REQUIRED) {
          newOrderStatus = OrderStatus.PREPARING;
        }
    } else if (itemStatuses.length > 0 && itemStatuses.every(s => s === OrderItemStatus.PENDING)) {
        if (currentOrder.status === OrderStatus.ACTION_REQUIRED || currentOrder.status === OrderStatus.PREPARING) {
          newOrderStatus = OrderStatus.PENDING;
        }
    } else if (currentOrder.status === OrderStatus.ACTION_REQUIRED && itemStatuses.length > 0 && !itemStatuses.some(s => s === OrderItemStatus.SOLD_OUT)) {
        // If it was ACTION_REQUIRED, and no more SOLD_OUT items, try to revert to PENDING or PREPARING
        if (itemStatuses.every(s => s === OrderItemStatus.PENDING)) {
            newOrderStatus = OrderStatus.PENDING;
        } else if (itemStatuses.some(s => s === OrderItemStatus.PREPARING || s === OrderItemStatus.READY || s === OrderItemStatus.SERVED)) {
            newOrderStatus = OrderStatus.PREPARING;
        } else {
             newOrderStatus = OrderStatus.PENDING; // Default if all items are PENDING after resolution
        }
    }


    if (newOrderStatus !== currentOrder.status) {
        return txClient.order.update({
            where: { id: orderId },
            data: { status: newOrderStatus },
            include: FULL_ORDER_INCLUDES
        });
    }
    return txClient.order.findUnique({
        where: { id: orderId },
        include: FULL_ORDER_INCLUDES
    });
};

// --- createOrderForSession ---
export const createOrderForSession = async (sessionId, orderData, staffId) => {
  const { items: itemsInput, notes } = orderData;
  if (!itemsInput || !Array.isArray(itemsInput) || itemsInput.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  return prisma.$transaction(async (tx) => {
    const diningSession = await tx.diningSession.findUnique({ where: { id: sessionId } });
    if (!diningSession) throw new Error('Dining session not found.');
    if (diningSession.status !== DiningSessionStatus.ACTIVE) {
      throw new Error(`Cannot add order to session with status: ${diningSession.status}`);
    }

    const menuItemIds = itemsInput.map(item => item.menuItemId);
    const menuItemsDb = await tx.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });
    const menuItemMap = new Map(menuItemsDb.map(item => [item.id, item]));

    const orderItemsToCreate = itemsInput.map(itemInput => {
      const menuItem = menuItemMap.get(itemInput.menuItemId);
      if (!menuItem) throw new Error(`Menu item ID ${itemInput.menuItemId} not found or is unavailable.`);
      if (!itemInput.quantity || itemInput.quantity <= 0) throw new Error(`Invalid quantity for ${menuItem.name}.`);
      return {
        menuItemId: menuItem.id,
        quantity: itemInput.quantity,
        priceAtOrderTime: menuItem.price,
        specialRequests: itemInput.specialRequests || null,
        status: OrderItemStatus.PENDING,
      };
    });

    const newOrder = await tx.order.create({
      data: {
        diningSessionId: sessionId,
        staffIdTakenBy: staffId,
        status: OrderStatus.PENDING,
        notes: notes || null,
        items: { create: orderItemsToCreate },
      },
      include: FULL_ORDER_INCLUDES,
    });
    return newOrder;
  });
};

// --- getOrderById ---
export const getOrderById = async (orderId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: FULL_ORDER_INCLUDES });
    if (!order) throw new Error('Order not found');
    return order;
};

// --- getAllOrders (for KDS, etc.) ---
export const getAllOrders = async (filters = {}) => {
    const whereClause = {};
    if (filters.status) {
        const statuses = filters.status.split(',')
                            .map(s => s.trim().toUpperCase())
                            .filter(s => Object.values(OrderStatus).includes(s));
        if (statuses.length > 0) whereClause.status = { in: statuses };
    }
    if (filters.diningSessionId) whereClause.diningSessionId = filters.diningSessionId;

    return prisma.order.findMany({ where: whereClause, include: FULL_ORDER_INCLUDES, orderBy: { orderTime: 'asc' } });
};

export const updateOrderStatus = async (orderId, newStatus, staffId) => {
  if (!Object.values(OrderStatus).includes(newStatus)) {
    throw new Error(`Invalid order status: ${newStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    if (!order) throw new Error('Order not found.');

    // --- MODIFIED CANCELLATION LOGIC ---
    if (newStatus === OrderStatus.CANCELLED) {
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ACTION_REQUIRED) {
        throw new Error(
          `Order cannot be cancelled. Only PENDING or ACTION_REQUIRED orders can be cancelled. Current status: ${order.status}`
        );
      }
      // If already CANCELLED, no change needed (or throw error)
      if (order.status === OrderStatus.CANCELLED) {
          throw new Error(`Order is already cancelled.`);
      }
    } else { // For other status transitions (PREPARING, READY, SERVED)
      const allowedTransitions = validOrderStatusTransitions[order.status] || [];
      if (!allowedTransitions.includes(newStatus) && order.status !== newStatus) {
          throw new Error(`Invalid status transition for order from ${order.status} to ${newStatus}.`);
      }
    }
    // --- END MODIFIED CANCELLATION LOGIC ---

    let itemStatusToSet = null;
    let applicableItemCurrentStatuses = [];

    if (newStatus === OrderStatus.PREPARING) {
        itemStatusToSet = OrderItemStatus.PREPARING;
        applicableItemCurrentStatuses = [OrderItemStatus.PENDING];
    } else if (newStatus === OrderStatus.READY) {
        itemStatusToSet = OrderItemStatus.READY;
        applicableItemCurrentStatuses = [OrderItemStatus.PENDING, OrderItemStatus.PREPARING];
    } else if (newStatus === OrderStatus.SERVED) {
        itemStatusToSet = OrderItemStatus.SERVED;
        applicableItemCurrentStatuses = [OrderItemStatus.PENDING, OrderItemStatus.PREPARING, OrderItemStatus.READY];
    } else if (newStatus === OrderStatus.CANCELLED) {
        itemStatusToSet = OrderItemStatus.CANCELLED;
        // If order is cancelled, cancel all items regardless of their current individual status
        // (unless already SERVED, but our top check prevents cancelling SERVED orders now)
        applicableItemCurrentStatuses = Object.values(OrderItemStatus).filter(s => s !== OrderItemStatus.SERVED);
    }


    if (itemStatusToSet && order.items && order.items.length > 0) {
      const itemIdsToUpdate = order.items
        .filter(item => applicableItemCurrentStatuses.includes(item.status))
        .map(item => item.id);

      if (itemIdsToUpdate.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: itemIdsToUpdate } },
          data: { status: itemStatusToSet },
        });
      }
    }

    // Update the order status itself
    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    });

    // Sync and return the fully populated order
    // If newStatus is CANCELLED, syncOrderStatusBasedOnItems should confirm this.
    return syncOrderStatusBasedOnItems(orderId, tx);
  });
};


// --- updateOrderItemStatus (Handles Item-Specific Changes & SOLD_OUT Propagation) ---
export const updateOrderItemStatus = async (orderItemId, newStatus, reason = null, staffId) => {
  if (!Object.values(OrderItemStatus).includes(newStatus)) {
    throw new Error(`Invalid order item status: ${newStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findUnique({
      where: {id: orderItemId},
      include: { order: true, menuItem: true }
    });
    if(!orderItem) throw new Error('Order item not found.');

    const allowedTransitions = validOrderItemStatusTransitions[orderItem.status] || [];
     if (!allowedTransitions.includes(newStatus) && orderItem.status !== newStatus) {
        throw new Error(`Invalid item status transition from ${orderItem.status} to ${newStatus}.`);
    }

    const itemUpdateData = { status: newStatus };
    // If you add a 'reasonForStatus' field to OrderItem schema:
    // if (reason) itemUpdateData.reasonForStatus = reason;

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: itemUpdateData,
    });

    if (newStatus === OrderItemStatus.SOLD_OUT) {
      // Propagate SOLD_OUT to other pending/preparing items of the same menuItem
      const otherAffectedItems = await tx.orderItem.findMany({
        where: {
          menuItemId: orderItem.menuItemId,
          id: { not: orderItemId },
          order: { status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.ACTION_REQUIRED] } },
          status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING]}
        }
      });

      if (otherAffectedItems.length > 0) {
        const otherItemIds = otherAffectedItems.map(i => i.id);
        await tx.orderItem.updateMany({
          where: { id: { in: otherItemIds } },
          data: { status: OrderItemStatus.SOLD_OUT /*, reasonForStatus: reason || "Propagated sold out" */ },
        });
        // Sync parent orders of these other affected items
        const affectedParentOrderIds = [...new Set(otherAffectedItems.map(i => i.orderId))];
        for (const parentOrderId of affectedParentOrderIds) {
            if (parentOrderId !== orderItem.orderId) { // Avoid double sync if it's the same order
                 await syncOrderStatusBasedOnItems(parentOrderId, tx);
            }
        }
      }
      // Optionally mark the MenuItem itself as generally unavailable
      // await tx.menuItem.update({ where: {id: orderItem.menuItemId}, data: {isAvailable: false }});
    }

    // Always re-evaluate and sync the original item's parent order status.
    return syncOrderStatusBasedOnItems(orderItem.orderId, tx);
  });
};

// --- resolveActionRequiredOrder (Waiter Fixes Order) ---
export const resolveActionRequiredOrder = async (orderId, resolutionData, staffId) => {
  const { itemsToCancelIds = [], itemsToUpdate = [], itemsToAdd = [] } = resolutionData;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
        where: {id: orderId},
        include: { items: { include: { menuItem: true } } } // Include menuItem for price and availability
    });

    if (!order) throw new Error('Order not found.');
    if (order.status !== OrderStatus.ACTION_REQUIRED) {
        throw new Error('Order is not in ACTION_REQUIRED state. Cannot apply resolution.');
    }

    // 1. Cancel items marked for cancellation (includes original SOLD_OUT ones if requested)
    if (itemsToCancelIds.length > 0) {
        await tx.orderItem.updateMany({
            where: { id: { in: itemsToCancelIds }, orderId: orderId },
            data: { status: OrderItemStatus.CANCELLED }
        });
    }

    // 2. Update existing items (quantity, special requests) - for items NOT being cancelled
    for (const itemUpdate of itemsToUpdate) {
        const { orderItemId, quantity, specialRequests } = itemUpdate;
        // Ensure this item is not in itemsToCancelIds
        if (itemsToCancelIds.includes(orderItemId)) continue;

        const existingItem = order.items.find(i => i.id === orderItemId);
        if (!existingItem) throw new Error(`Item ${orderItemId} to update not found in order ${orderId}.`);
        if (quantity <= 0) throw new Error(`Quantity for item ${existingItem.menuItem.name} must be positive.`);

        await tx.orderItem.update({
            where: { id: orderItemId },
            data: {
                quantity,
                specialRequests: specialRequests || existingItem.specialRequests,
                // Status will be reset by syncOrderStatusBasedOnItems, or set explicitly to PENDING if needed
                // For now, let sync handle it. Or set PENDING here if desired.
            }
        });
    }

    // 3. Add new items
    if (itemsToAdd.length > 0) {
        const menuItemIds = itemsToAdd.map(item => item.menuItemId);
        const menuItemsDb = await tx.menuItem.findMany({
          where: { id: { in: menuItemIds }, isAvailable: true },
        });
        const menuItemMap = new Map(menuItemsDb.map(item => [item.id, item]));

        const newOrderItemsData = itemsToAdd.map(itemInput => {
            const menuItem = menuItemMap.get(itemInput.menuItemId);
            if (!menuItem) throw new Error(`New menu item ID ${itemInput.menuItemId} for reorder not found or unavailable.`);
            if (!itemInput.quantity || itemInput.quantity <= 0) throw new Error(`Invalid quantity for new item ${menuItem.name}.`);
            return {
                menuItemId: menuItem.id,
                quantity: itemInput.quantity,
                priceAtOrderTime: menuItem.price,
                specialRequests: itemInput.specialRequests || null,
                status: OrderItemStatus.PENDING, // New items start as PENDING
            };
        });
        await tx.order.update({
            where: { id: orderId },
            data: { items: { create: newOrderItemsData } }
        });
    }

    // 4. After all modifications, re-sync the parent order's status.
    return syncOrderStatusBasedOnItems(orderId, tx);
  });
};