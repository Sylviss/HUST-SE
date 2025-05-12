// ./backend/src/services/menuItemService.js
import prisma from '../db/prismaClient.js';

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