// ./backend/src/controllers/menuItemController.js
import * as menuItemService from '../services/menuItemService.js';

export const createMenuItemHandler = async (req, res, next) => {
  try {
    const menuItem = await menuItemService.createMenuItem(req.body);
    res.status(201).json(menuItem);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) { // Prisma unique constraint error
      return res.status(400).json({ message: `Menu item with name '${req.body.name}' already exists.` });
    }
    next(error);
  }
};

export const getAllMenuItemsHandler = async (req, res, next) => {
  try {
    // Example of allowing a filter for public vs. admin views
    let filters = {};
    if (req.query.availableOnly === 'true') {
        filters.isAvailable = true;
    }
    // For admin view (isManager), they see all items by default or based on other filters
    // For public/waiter view, you might always enforce filters.isAvailable = true
    // This logic can be refined based on who is calling
    const menuItems = await menuItemService.getAllMenuItems(filters);
    res.status(200).json(menuItems);
  } catch (error) {
    next(error);
  }
};

export const getMenuItemByIdHandler = async (req, res, next) => {
  try {
    const menuItem = await menuItemService.getMenuItemById(req.params.itemId);
    res.status(200).json(menuItem);
  } catch (error) {
    if (error.message === 'MenuItem not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const updateMenuItemHandler = async (req, res, next) => {
  try {
    const menuItem = await menuItemService.updateMenuItem(req.params.itemId, req.body);
    res.status(200).json(menuItem);
  } catch (error) {
    if (error.message === 'MenuItem not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res.status(400).json({ message: `Menu item with name '${req.body.name}' already exists.` });
    }
    next(error);
  }
};

export const deleteMenuItemHandler = async (req, res, next) => {
  try {
    await menuItemService.deleteMenuItem(req.params.itemId);
    res.status(204).send(); // No content
  } catch (error) {
    if (error.message === 'MenuItem not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};