// ./backend/src/controllers/tableController.js
import * as tableService from '../services/tableService.js';

export const createTableHandler = async (req, res, next) => {
  try {
    const table = await tableService.createTable(req.body);
    res.status(201).json(table);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid table status')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('tableNumber')) { // Prisma unique constraint
        return res.status(400).json({ message: `Table number '${req.body.tableNumber}' already exists.` });
    }
    next(error);
  }
};

export const getAllTablesHandler = async (req, res, next) => {
  try {
    const filters = req.query; // e.g., ?status=AVAILABLE&minCapacity=2
    const tables = await tableService.getAllTables(filters);
    res.status(200).json(tables);
  } catch (error) {
    next(error);
  }
};

export const getTableByIdHandler = async (req, res, next) => {
  try {
    const table = await tableService.getTableById(req.params.tableId);
    res.status(200).json(table);
  } catch (error) {
    if (error.message === 'Table not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const updateTableHandler = async (req, res, next) => {
  try {
    const table = await tableService.updateTable(req.params.tableId, req.body);
    res.status(200).json(table);
  } catch (error) {
    if (error.message === 'Table not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('required') || error.message.includes('Invalid table status') || error.message.includes('already exists') || error.message.includes('Capacity')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

export const updateTableStatusHandler = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required."});
        }
        const table = await tableService.updateTableStatus(req.params.tableId, status);
        res.status(200).json(table);
    } catch (error) {
        if (error.message === 'Table not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Invalid table status')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

export const deleteTableHandler = async (req, res, next) => {
  try {
    await tableService.deleteTable(req.params.tableId);
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Table not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Cannot delete table')) {
        return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};