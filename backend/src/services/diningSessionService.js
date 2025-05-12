// ./backend/src/services/diningSessionService.js
import prisma from '../db/prismaClient.js';
import { DiningSessionStatus, ReservationStatus, TableStatus } from '@prisma/client';

export const startDiningSession = async (sessionData, staffId) => {
  const { tableId, reservationId, partyIdentifier, partySize } = sessionData;

  if (!tableId || !partySize || partySize <= 0) {
    throw new Error('Table ID and valid party size are required.');
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) {
    throw new Error('Table not found.');
  }
  if (table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
    throw new Error(`Table ${table.tableNumber} is not available. Current status: ${table.status}`);
  }
  if (table.capacity < partySize) {
    throw new Error(`Table ${table.tableNumber} capacity (${table.capacity}) is less than party size (${partySize}).`);
  }

  let reservationToLink = null;
  if (reservationId) {
    reservationToLink = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        customer: true
      }
    });
    if (!reservationToLink) {
      throw new Error('Reservation not found.');
    }
    if (reservationToLink.status !== ReservationStatus.CONFIRMED) {
      throw new Error(`Reservation must be CONFIRMED to start a session. Current status: ${reservationToLink.status}`);
    }
    if (reservationToLink.diningSession) { // Check if this field exists on relation
        throw new Error('This reservation is already linked to an active dining session.');
    }
    // Optionally check if reservation's tableId matches provided tableId if reservation.tableId is set
    if (reservationToLink.tableId && reservationToLink.tableId !== tableId) {
        console.warn(`Warning: Seating reservation ${reservationId} at table ${tableId}, but reservation was for table ${reservationToLink.tableId}.`);
        // Depending on policy, you might allow or disallow this.
    }
  }

  // Start a transaction to ensure atomicity
  const newSession = await prisma.$transaction(async (tx) => {
    // Create the dining session
    const session = await tx.diningSession.create({
      data: {
        tableId,
        reservationId: reservationId || null,
        staffIdOpenedBy: staffId,
        partyIdentifier: reservationToLink ? reservationToLink.customer.name : (partyIdentifier || `Party of ${partySize}`),
        partySize,
        status: DiningSessionStatus.ACTIVE,
      },
      include: { table: true, reservation: { include: {customer: true} }, openedBy: {select: {id:true, name:true}} }
    });

    // Update table status to OCCUPIED
    await tx.table.update({
      where: { id: tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    // Update reservation status to SEATED if linked
    if (reservationId) {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.SEATED },
      });
    }
    return session;
  });

  return newSession;
};

export const getDiningSessionById = async (sessionId) => {
  const session = await prisma.diningSession.findUnique({
    where: { id: sessionId },
    include: {
      table: true,
      reservation: { include: { customer: true } },
      openedBy: { select: { id: true, name: true, role: true } },
      // orders: { include: { items: { include: { menuItem: true } } } }, // For later
      // bill: true // For later
    },
  });
  if (!session) throw new Error('Dining session not found');
  return session;
};

export const getAllDiningSessions = async (filters = {}) => {
  const whereClause = {};
  if (filters.tableId) whereClause.tableId = filters.tableId;
  if (filters.date) { /* ... date filter logic ... */ }

  if (filters.status) {
    const statuses = filters.status.split(','); // Handle comma-separated statuses
    if (statuses.length > 0) {
      whereClause.status = { in: statuses.map(s => s.trim().toUpperCase())
                                     .filter(s => Object.values(DiningSessionStatus).includes(s)) };
    }
  }

  return prisma.diningSession.findMany({
    where: whereClause,
    include: {
      table: { select: { id: true, tableNumber: true } }, // Select only needed fields for list
      reservation: { select: { id: true, customer: { select: { name: true }} } },
      openedBy: { select: { id: true, name: true } },
      // Avoid including all orders and items here for performance on a list view
    },
    orderBy: { startTime: 'desc' },
  });
};

export const closeDiningSession = async (sessionId, staffId) => {
    // This would typically be called after a bill is marked as PAID
    const session = await prisma.diningSession.findUnique({ where: { id: sessionId }});
    if(!session) throw new Error('Dining session not found.');
    if(session.status !== DiningSessionStatus.BILLED) { // Or allow closing active if no bill
        throw new Error(`Dining session must be in BILLED status to be closed. Current: ${session.status}`);
    }

    return prisma.$transaction(async (tx) => {
        const updatedSession = await tx.diningSession.update({
            where: { id: sessionId },
            data: {
                status: DiningSessionStatus.CLOSED,
                endTime: new Date()
            },
            include: { table: true }
        });

        // Update table status to AVAILABLE (or NEEDS_CLEANING)
        await tx.table.update({
            where: { id: updatedSession.tableId },
            // TODO: Implement logic for NEEDS_CLEANING status if required
            data: { status: TableStatus.AVAILABLE }
        });
        return updatedSession;
    });
};