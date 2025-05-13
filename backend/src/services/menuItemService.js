// ./backend/src/services/menuItemService.js
import prisma from '../db/prismaClient.js';
import { OrderItemStatus, OrderStatus } from '@prisma/client'

export const createMenuItem = async (itemData) => {
  const { name, description, price, isAvailable, tags, imageUrl } = itemData;
  // Add validation if needed (e.g., price must be positive)
  return prisma.menuItem.create({
    data: {
      name,
      description,
      price,
      isAvailable,
      tags: tags || [], // Ensure tags is an array
      imageUrl,
    },
  });
};

export const getAllMenuItems = async (filters = {}) => {
  // filters could include { isAvailable: true } for customer-facing views
  return prisma.menuItem.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
  });
};

export const getMenuItemById = async (itemId) => {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new Error('MenuItem not found'); // Or a custom NotFoundError
  }
  return item;
};

export const updateMenuItem = async (itemId, updateData) => {
  // Check if item exists first
  const existingItem = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!existingItem) {
    throw new Error('MenuItem not found');
  }
  return prisma.menuItem.update({
    where: { id: itemId },
    data: updateData,
  });
};

export const deleteMenuItem = async (itemId) => {
  // Check if item exists first
  const existingItem = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!existingItem) {
    throw new Error('MenuItem not found');
  }
  return prisma.menuItem.delete({
    where: { id: itemId },
  });
  // Consider soft delete by adding an `isDeleted` flag instead
};

export const setMenuItemAvailability = async (itemId, isAvailable) => {
  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.menuItem.findUnique({ where: { id: itemId } });
    if (!existingItem) {
      throw new Error('MenuItem not found');
    }

    const updatedMenuItem = await tx.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    // If the item is being marked as UNAVAILABLE (sold out globally for now)
    if (isAvailable === false) {
      // Find all OrderItems that reference this menuItemId, are in PENDING/PREPARING status,
      // and belong to Orders that are also in PENDING/PREPARING status.
      const affectedOrderItems = await tx.orderItem.findMany({
        where: {
          menuItemId: itemId,
          status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
          order: {
            status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.ACTION_REQUIRED] } // Include ACTION_REQUIRED in case it was already so for another reason
          }
        },
        select: { id: true, orderId: true } // Select IDs for update and parent order sync
      });

      if (affectedOrderItems.length > 0) {
        const affectedOrderItemIds = affectedOrderItems.map(item => item.id);
        // Mark these order items as SOLD_OUT
        await tx.orderItem.updateMany({
          where: { id: { in: affectedOrderItemIds } },
          data: { status: OrderItemStatus.SOLD_OUT },
        });

        // Now, update the status of their parent Orders to ACTION_REQUIRED
        // Need to get unique order IDs
        const uniqueAffectedOrderIds = [...new Set(affectedOrderItems.map(item => item.orderId))];

        // This loop is okay for a moderate number of affected orders.
        // For very high volume, a more optimized approach might be needed.
        // But calling syncOrderStatusBasedOnItems handles the logic correctly.
        // We could also directly update these orders to ACTION_REQUIRED here if we are certain.
        // For consistency, let's use syncOrderStatusBasedOnItems from orderService (if accessible or replicated)
        // For now, let's update them directly to ACTION_REQUIRED.
        // The sync function in orderService will confirm this state or adjust if other items dictate.
        await tx.order.updateMany({
            where: { id: { in: uniqueAffectedOrderIds } },
            data: { status: OrderStatus.ACTION_REQUIRED }
        });
        // Note: If orderService.syncOrderStatusBasedOnItems was easily callable here with 'tx',
        // it would be ideal: for (const orderId of uniqueAffectedOrderIds) { await syncOrderStatusBasedOnItems(orderId, tx); }
        // But that creates a circular dependency or requires moving syncOrderStatusBasedOnItems to a shared util.
        // For now, direct update to ACTION_REQUIRED after marking items SOLD_OUT is a reasonable step.
        // The next time syncOrderStatusBasedOnItems runs for these orders (e.g. during resolve), it will re-evaluate.
      }
    }
    // If isAvailable is true, no action on existing orders is typically needed.
    return updatedMenuItem;
  });
};