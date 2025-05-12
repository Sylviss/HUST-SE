// ./backend/src/services/tableService.js
import prisma from '../db/prismaClient.js';
import { TableStatus } from '@prisma/client'; // Prisma generates enums

export const createTable = async (tableData) => {
  const { tableNumber, capacity, status } = tableData;

  if (!tableNumber || !capacity || capacity <= 0) {
    throw new Error('Table number and valid capacity are required.');
  }
  if (status && !Object.values(TableStatus).includes(status)) {
    throw new Error(`Invalid table status: ${status}.`);
  }

  return prisma.table.create({
    data: {
      tableNumber,
      capacity,
      status: status || TableStatus.AVAILABLE, // Default to AVAILABLE if not provided
    },
  });
};

export const getAllTables = async (filters = {}) => {
  // filters could include { status: 'AVAILABLE', minCapacity: 4 }
  const whereClause = {};
  if (filters.status) whereClause.status = filters.status;
  if (filters.minCapacity) whereClause.capacity = { gte: parseInt(filters.minCapacity, 10) };

  return prisma.table.findMany({
    where: whereClause,
    orderBy: { tableNumber: 'asc' }, // Or by creation date, etc.
  });
};

export const getTableById = async (tableId) => {
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) {
    throw new Error('Table not found');
  }
  return table;
};

export const updateTable = async (tableId, updateData) => {
  const { tableNumber, capacity, status } = updateData;

  const existingTable = await prisma.table.findUnique({ where: { id: tableId } });
  if (!existingTable) {
    throw new Error('Table not found');
  }

  if (capacity && capacity <= 0) {
    throw new Error('Capacity must be a positive number.');
  }
  if (status && !Object.values(TableStatus).includes(status)) {
    throw new Error(`Invalid table status: ${status}.`);
  }
  // Prevent changing table number if it causes a conflict with an existing one (other than itself)
  if (tableNumber && tableNumber !== existingTable.tableNumber) {
    const conflictTable = await prisma.table.findUnique({ where: { tableNumber }});
    if (conflictTable) {
        throw new Error(`Table number '${tableNumber}' already exists.`);
    }
  }


  return prisma.table.update({
    where: { id: tableId },
    data: { tableNumber, capacity, status }, // Only update provided fields
  });
};

export const updateTableStatus = async (tableId, status) => {
  if (!Object.values(TableStatus).includes(status)) {
    throw new Error(`Invalid table status: ${status}.`);
  }
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { diningSessions: { where: { status: DiningSessionStatus.ACTIVE } } } // Check active sessions
  });

  if (!table) {
    throw new Error('Table not found');
  }

  // Business logic example:
  if (table.status === TableStatus.OCCUPIED && status !== TableStatus.OCCUPIED) {
    if (table.diningSessions && table.diningSessions.length > 0) {
      throw new Error(`Cannot change status from OCCUPIED while table has active dining sessions. Close sessions first.`);
    }
  }
  if (table.status === TableStatus.RESERVED && status === TableStatus.OCCUPIED) {
      throw new Error(`Cannot directly set RESERVED table to OCCUPIED. Start a dining session instead.`);
  }
  // More rules can be added, e.g., from RESERVED to AVAILABLE only if reservation is cancelled/moved.

  return prisma.table.update({
    where: {id: tableId},
    data: { status }
  });
}

export const deleteTable = async (tableId) => {
  const existingTable = await prisma.table.findUnique({
    where: { id: tableId },
    include: { reservations: true /*, diningSessions: true */ }, // Check for related records
  });
  if (!existingTable) {
    throw new Error('Table not found');
  }
  // Basic check: prevent deletion if there are active/future reservations or active sessions
  // More complex logic might be needed (e.g., reassigning reservations)
  if (existingTable.reservations.some(r => r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'SEATED')) {
    throw new Error('Cannot delete table with active or future reservations. Please cancel/reassign them first.');
  }
  // if (existingTable.diningSessions.some(s => s.status === 'Active')) {
  //   throw new Error('Cannot delete table with active dining sessions.');
  // }

  return prisma.table.delete({
    where: { id: tableId },
  });
};