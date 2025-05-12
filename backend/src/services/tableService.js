// ./backend/src/services/tableService.js
import prisma from '../db/prismaClient.js';
import { TableStatus, DiningSessionStatus, ReservationStatus } from '@prisma/client'; // Import ReservationStatus

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

export const updateTableStatus = async (tableId, newStatus) => {
  if (!Object.values(TableStatus).includes(newStatus)) {
    throw new Error(`Invalid table status: ${newStatus}.`);
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      diningSessions: { where: { status: DiningSessionStatus.ACTIVE } },
      // Include reservations that are confirmed or pending for this table around the current time
      // This check can be complex to define "around current time" perfectly for all cases.
      // A simpler check is if it's reserved and being made available without cancelling reservation.
      reservations: {
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
          // Optionally add a time window check if necessary, e.g., for today or near future
          // reservationTime: { gte: new Date(new Date().setHours(0,0,0,0)) }
        }
      }
    }
  });

  if (!table) {
    throw new Error('Table not found');
  }

  // If current status is RESERVED and trying to change to AVAILABLE or NEEDS_CLEANING etc.
  if (table.status === TableStatus.RESERVED &&
      (newStatus === TableStatus.AVAILABLE || newStatus === TableStatus.NEEDS_CLEANING || newStatus === TableStatus.OUT_OF_SERVICE) ) {
    // Check if there are any active (CONFIRMED/PENDING) reservations linked to this table.
    // The include above should fetch these.
    if (table.reservations && table.reservations.length > 0) {
      // Check if ANY of these reservations are still active for this table.
      // A reservation being SEATED means it's now a DiningSession, so table would be OCCUPIED.
      // So we are mainly concerned about CONFIRMED or PENDING future reservations.
      const activeLinkedReservations = table.reservations.filter(
        r => r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING
      );
      if (activeLinkedReservations.length > 0) {
        throw new Error(
          `Cannot change status from RESERVED. Table ${table.tableNumber} is reserved for an upcoming booking. Please manage the reservation(s) first.`
        );
      }
    }
  }

  // If current status is OCCUPIED and trying to change to something other than OCCUPIED
  if (table.status === TableStatus.OCCUPIED && newStatus !== TableStatus.OCCUPIED) {
    if (table.diningSessions && table.diningSessions.length > 0) {
      throw new Error(`Cannot change status from OCCUPIED. Table ${table.tableNumber} has active dining sessions. Close sessions first.`);
    }
  }

  // Prevent directly setting a table to OCCUPIED or RESERVED via this generic status update.
  // OCCUPIED status should be set when a DiningSession starts.
  // RESERVED status should be set when a Reservation is confirmed for this table.
  if (newStatus === TableStatus.OCCUPIED && table.status !== TableStatus.OCCUPIED) {
    throw new Error(`Cannot directly set table status to OCCUPIED. Start a dining session for the table instead.`);
  }
  if (newStatus === TableStatus.RESERVED && table.status !== TableStatus.RESERVED) {
    throw new Error(`Cannot directly set table status to RESERVED. Confirm a reservation for the table instead.`);
  }

  // If all checks pass, update the status
  return prisma.table.update({
    where: {id: tableId},
    data: { status: newStatus }
  });
};


export const deleteTable = async (tableId) => {
  const existingTable = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
          reservations: { where: { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING, ReservationStatus.SEATED] }}},
          diningSessions: { where: { status: DiningSessionStatus.ACTIVE }}
      },
  });
  if (!existingTable) {
      throw new Error('Table not found');
  }

  if (existingTable.reservations.length > 0) {
      throw new Error('Cannot delete table with active or future reservations. Please cancel/reassign them first.');
  }
  if (existingTable.diningSessions.length > 0) {
    throw new Error('Cannot delete table with active dining sessions.');
  }

  return prisma.table.delete({
      where: { id: tableId },
  });
};