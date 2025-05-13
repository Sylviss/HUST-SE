// ./backend/src/services/diningSessionService.js
import prisma from '../db/prismaClient.js';
import { DiningSessionStatus, ReservationStatus, TableStatus } from '@prisma/client';

export const startDiningSession = async (sessionData, staffId) => {
  const { tableId, reservationId, partyIdentifier, partySize: inputPartySize } = sessionData;

  if (!tableId || !inputPartySize || inputPartySize <= 0) {
    throw new Error('Table ID and valid party size are required.');
  }

  // Start a transaction for atomicity
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({ where: { id: tableId } });
    if (!table) {
      throw new Error('Table not found.');
    }
    if (table.capacity < inputPartySize) {
      throw new Error(`Table ${table.tableNumber} capacity (${table.capacity}) is insufficient for party size (${inputPartySize}).`);
    }

    let reservationToLink = null;
    let effectivePartySize = inputPartySize; // Use inputPartySize by default for walk-ins

    if (reservationId) {
      // --- SCENARIO: Party arrives WITH a Reservation ---
      reservationToLink = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { customer: true } // For partyIdentifier if needed
      });

      if (!reservationToLink) {
        throw new Error('Reservation not found.');
      }
      if (reservationToLink.status !== ReservationStatus.CONFIRMED) {
        // Allow seating PENDING reservations too? Or only CONFIRMED? Let's stick to CONFIRMED for now.
        throw new Error(`Reservation must be CONFIRMED to start a session. Current status: ${reservationToLink.status}`);
      }
      // Ensure this reservation isn't already linked to another active session
      const existingSessionForReservation = await tx.diningSession.findFirst({
        where: { reservationId: reservationId, status: DiningSessionStatus.ACTIVE }
      });
      if (existingSessionForReservation) {
          throw new Error('This reservation is already linked to an active dining session.');
      }

      effectivePartySize = reservationToLink.partySize; // Use party size from reservation
      if (table.capacity < effectivePartySize) {
          throw new Error(`Table ${table.tableNumber} capacity (${table.capacity}) is insufficient for reservation party size (${effectivePartySize}).`);
      }


      // Rule 2: Reserved Party to Reserved Table Only
      if (reservationToLink.tableId) { // If reservation has a pre-assigned table
        if (reservationToLink.tableId !== tableId) {
          throw new Error(
            `This reservation is for Table ${ (await tx.table.findUnique({where: {id: reservationToLink.tableId}}))?.tableNumber || reservationToLink.tableId }. Please seat them at their assigned table.`
          );
        }
        // If tableId matches reservation.tableId, check if the table is indeed RESERVED (or AVAILABLE if just became free)
        if (table.status !== TableStatus.RESERVED && table.status !== TableStatus.AVAILABLE) {
            throw new Error(`Assigned Table ${table.tableNumber} is not in a seatable status (Expected RESERVED or AVAILABLE). Current status: ${table.status}`);
        }
      } else { // Reservation does NOT have a pre-assigned table
        // Rule 1 (Implicitly handled): We are trying to seat them at 'tableId'.
        // Check if the chosen 'tableId' is AVAILABLE (not RESERVED for someone else).
        if (table.status !== TableStatus.AVAILABLE) {
          throw new Error(
            `Table ${table.tableNumber} is not AVAILABLE for a reservation without a pre-assigned table. Current status: ${table.status}`
          );
        }
        // At this point, we might assign this tableId to the reservation record itself
        // This is a good place to do it if the reservation was confirmed without a table.
      }
    } else {
      // --- SCENARIO: Party is a WALK-IN (no reservationId provided) ---
      // Rule 3: Available Tables for Walk-ins
      if (table.status !== TableStatus.AVAILABLE) {
        throw new Error(
          `Table ${table.tableNumber} is not AVAILABLE for walk-ins. Current status: ${table.status}.`
        );
      }
    }

    // If all checks pass:
    // Create the dining session
    const session = await tx.diningSession.create({
      data: {
        tableId,
        reservationId: reservationId || null,
        staffIdOpenedBy: staffId,
        partyIdentifier: reservationToLink ? (reservationToLink.customer?.name || `Reservation ${reservationId.slice(-6)}`) : (partyIdentifier || `Party of ${effectivePartySize}`),
        partySize: effectivePartySize,
        status: DiningSessionStatus.ACTIVE,
      },
      include: { table: true, reservation: { include: {customer: true} }, openedBy: {select: {id:true, name:true}} }
    });

    // Update table status to OCCUPIED
    await tx.table.update({
      where: { id: tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    // Update reservation status to SEATED if linked, and assign tableId if it wasn't pre-assigned
    if (reservationToLink) {
      const reservationUpdateData = { status: ReservationStatus.SEATED };
      if (!reservationToLink.tableId) { // If reservation didn't have a table, assign this one
        reservationUpdateData.tableId = tableId;
      }
      await tx.reservation.update({
        where: { id: reservationId },
        data: reservationUpdateData,
      });
    }
    return session;
  });
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
  const session = await prisma.diningSession.findUnique({
      where: { id: sessionId },
      include: { bill: true } // Include bill to check its status
  });

  if(!session) throw new Error('Dining session not found.');

  // Strict check: Session should ideally be BILLED and its Bill PAID before closing.
  // Or, if your workflow allows closing an ACTIVE session (e.g., walkout), this logic changes.
  // For now, assuming closure follows a PAID bill.
  if(session.status !== DiningSessionStatus.BILLED) {
      // Check if there's a bill and if it's paid
      const associatedBill = await prisma.bill.findUnique({
          where: { diningSessionId: sessionId }
      });
      if (!associatedBill || associatedBill.status !== BillStatus.PAID) {
           throw new Error(`Dining session cannot be closed. Bill is not yet paid or session not marked as BILLED. Current session status: ${session.status}`);
      }
  }


  return prisma.$transaction(async (tx) => {
      const updatedSession = await tx.diningSession.update({
          where: { id: sessionId },
          data: {
              status: DiningSessionStatus.CLOSED,
              endTime: new Date()
          },
          // Include reservationId to update the linked reservation
          select: { id: true, tableId: true, reservationId: true }
      });

      // Update table status to AVAILABLE (or NEEDS_CLEANING)
      await tx.table.update({
          where: { id: updatedSession.tableId },
          data: { status: TableStatus.AVAILABLE } // Or NEEDS_CLEANING based on policy
      });

      // NEW: Update linked reservation status to COMPLETED
      if (updatedSession.reservationId) {
          await tx.reservation.update({
              where: { id: updatedSession.reservationId },
              data: { status: ReservationStatus.COMPLETED }
          });
      }

      // Re-fetch full session to return to controller if needed, or just return a success indicator
      return tx.diningSession.findUnique({
          where: {id: updatedSession.id},
          include: {table: true, reservation: true}
      });
  });
};