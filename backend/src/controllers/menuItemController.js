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
    let filters = {};
    // Check if this is the specific admin path or if the user is a manager and no specific filter is set
    if (req.path.endsWith('/all-for-admin') && req.staff?.role === 'MANAGER') {
      // No default availability filter for this admin path
      if (req.query.isAvailable === 'true') filters.isAvailable = true;
      else if (req.query.isAvailable === 'false') filters.isAvailable = false;
    } else {
      // Default for '/' path, or if not the admin path
      filters.isAvailable = true; // Default to available items
      if (req.query.availableOnly === 'false' && req.staff?.role === 'MANAGER') {
        // Manager explicitly requested all items via the public path
        delete filters.isAvailable;
      } else if (req.query.availableOnly === 'true') {
        filters.isAvailable = true;
      }
    }
    // console.log(`getAllMenuItemsHandler: path=${req.path}, query=${JSON.stringify(req.query)}, appliedFilters=${JSON.stringify(filters)}`);
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