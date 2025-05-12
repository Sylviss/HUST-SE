// ./backend/src/services/reservationService.js
import prisma from '../db/prismaClient.js';
import { findOrCreateCustomer } from './customerService.js';
import { ReservationStatus, TableStatus } from '@prisma/client';

const checkTableAvailability = async (tx, reservationTime, partySize, requestedTableId = null, excludeReservationId = null) => {
  const reservationWindowMinutes = 90; // e.g., assume a reservation blocks a table for 1.5 hours
  const startTime = new Date(reservationTime);
  const endTime = new Date(startTime.getTime() + reservationWindowMinutes * 60000);

  if (requestedTableId) {
    const table = await tx.table.findUnique({ where: { id: requestedTableId } });
    if (!table || table.capacity < partySize) {
      throw new Error('Requested table is not suitable or does not exist.');
    }

    // Check for overlapping confirmed reservations on this specific table
    const conflictingReservations = await tx.reservation.count({
      where: {
        tableId: requestedTableId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: ReservationStatus.CONFIRMED, // Or PENDING too if pending blocks table
        OR: [
          { reservationTime: { lt: endTime, gte: startTime } }, // Starts within window
          // Add more complex overlap checks if needed (e.g., existing res ends within new window)
        ],
      },
    });
    if (conflictingReservations > 0) {
      throw new Error(`Table ${table.tableNumber} is already booked around the requested time.`);
    }
    // Check for overlapping active dining sessions (simplified: assumes session occupies table fully)
    // More complex: check session start/end times if available
    if (table.status === TableStatus.OCCUPIED) {
        // Check if a dining session is active and overlaps
        const activeSession = await tx.diningSession.findFirst({
            where: {
                tableId: requestedTableId,
                status: DiningSessionStatus.ACTIVE, // Or BILLED
                // AND: [ // Overlap check more complex here
                //    { startTime: { lt: endTime } },
                //    { OR: [{ endTime: { gt: startTime } }, { endTime: null }] }
                // ]
            }
        });
        if(activeSession) {
             throw new Error(`Table ${table.tableNumber} is currently occupied or has an active session overlapping this time.`);
        }
    }


    return table; // Return the table if it's suitable and available by these checks
  } else {
    // Find ANY suitable and available table
    const availableTables = await tx.table.findMany({
      where: {
        capacity: { gte: partySize },
        status: TableStatus.AVAILABLE, // Start with generally available tables
        // Further filter by checking no conflicting reservations or sessions for *each* table
      },
      orderBy: { capacity: 'asc' }, // Prefer smaller tables that fit
    });

    for (const table of availableTables) {
      try {
        await checkTableAvailability(tx, reservationTime, partySize, table.id, excludeReservationId);
        return table; // First table that passes detailed checks
      } catch (error) {
        // This table is not available, try next
        console.warn(`Auto-assign check failed for table ${table.tableNumber}: ${error.message}`);
      }
    }
    throw new Error('No suitable tables available for the requested time and party size.');
  }
};

export const createReservation = async (reservationData, customerDetails) => {
  // ... (customer creation logic as before) ...
  const { reservationTime, partySize, notes, tableId: requestedTableId } = reservationData;
   if (!reservationTime || !partySize || partySize <= 0) {
        throw new Error('Reservation time and valid party size are required.');
  }
  const customer = await findOrCreateCustomer(customerDetails);


  // Using the more robust check within a transaction for consistency
  return prisma.$transaction(async (tx) => {
    const assignedTable = await checkTableAvailability(tx, new Date(reservationTime), partySize, requestedTableId);

    return tx.reservation.create({
      data: {
        customerId: customer.id,
        reservationTime: new Date(reservationTime),
        partySize,
        notes,
        status: ReservationStatus.PENDING,
        tableId: assignedTable ? assignedTable.id : null, // Assign if a table was found/validated
      },
      include: { customer: true, table: true },
    });
  });
};

export const confirmReservation = async (reservationId, staffId, tableIdToAssign = null) => {
    return prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({ where: { id: reservationId } });
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.status !== ReservationStatus.PENDING) {
            throw new Error(`Reservation cannot be confirmed. Current status: ${reservation.status}`);
        }

        let finalTableId = reservation.tableId || tableIdToAssign;
        let assignedTable;

        if (finalTableId) {
            assignedTable = await checkTableAvailability(tx, reservation.reservationTime, reservation.partySize, finalTableId, reservation.id);
            // checkTableAvailability throws if not suitable
        } else {
            // Attempt to auto-assign a table if none was pre-assigned or provided now
            assignedTable = await checkTableAvailability(tx, reservation.reservationTime, reservation.partySize, null, reservation.id);
            finalTableId = assignedTable.id;
        }

        // Update reservation
        const confirmedReservation = await tx.reservation.update({
            where: { id: reservationId },
            data: {
                status: ReservationStatus.CONFIRMED,
                staffIdConfirmedBy: staffId,
                tableId: finalTableId,
            },
            include: { customer: true, table: true, confirmedBy: { select: { id: true, name: true } } },
        });

        // Optionally update table status to RESERVED
        if (finalTableId) {
             const table = await tx.table.findUnique({where: {id: finalTableId}});
             if(table && table.status === TableStatus.AVAILABLE) { // Only if it was available
                await tx.table.update({
                    where: { id: finalTableId },
                    data: { status: TableStatus.RESERVED },
                });
             }
        }
        return confirmedReservation;
    });
};

export const cancelReservation = async (reservationId) => {
    return prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
            where: { id: reservationId },
            include: { table: true } // Include table to check its status
        });
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.status === ReservationStatus.SEATED || reservation.status === ReservationStatus.COMPLETED) {
            throw new Error(`Cannot cancel reservation. Current status: ${reservation.status}`);
        }

        // If a table was assigned and its status is RESERVED (specifically for this reservation), free it up.
        if (reservation.tableId && reservation.table && reservation.table.status === TableStatus.RESERVED) {
            // More complex: ensure no other CONFIRMED reservation for this table at same time before making AVAILABLE
            await tx.table.update({
                where: { id: reservation.tableId },
                data: { status: TableStatus.AVAILABLE }
            });
        }

        return tx.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.CANCELLED },
            include: { customer: true, table: true },
        });
    });
};

export const getReservationById = async (reservationId) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { customer: true, table: true, confirmedBy: { select: { id: true, name: true }} },
  });
  if (!reservation) throw new Error('Reservation not found');
  return reservation;
};

export const getAllReservations = async (filters = {}) => {
  // Example filters: { status: 'PENDING', date: 'YYYY-MM-DD' }
  const whereClause = {};
  if (filters.status) whereClause.status = filters.status;
  if (filters.date) {
    const startDate = new Date(filters.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filters.date);
    endDate.setHours(23, 59, 59, 999);
    whereClause.reservationTime = { gte: startDate, lte: endDate };
  }

  return prisma.reservation.findMany({
    where: whereClause,
    include: { customer: true, table: true, confirmedBy: { select: { id: true, name: true }} },
    orderBy: { reservationTime: 'asc' },
  });
};

// seatReservation, completeReservation, noShowReservation methods to be added later
// e.g., when DiningSession is created, it will call seatReservation