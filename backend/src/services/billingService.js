// ./backend/src/services/billingService.js
import prisma from '../db/prismaClient.js';
import { BillStatus, DiningSessionStatus, OrderStatus, OrderItemStatus, TableStatus, ReservationStatus } from '@prisma/client';

// Helper function to calculate bill totals
const calculateBillAmounts = (orders) => {
  let subtotal = 0;
  orders.forEach(order => {
    // Only include non-cancelled orders in bill calculation
    if (order.status !== OrderStatus.CANCELLED) {
      order.items.forEach(item => {
        // Only bill for items that were served or were ready (and not subsequently cancelled/sold-out before serving)
        // Items marked SOLD_OUT or CANCELLED should not contribute to the bill.
        if ((item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY) &&
            item.status !== OrderItemStatus.CANCELLED &&
            item.status !== OrderItemStatus.SOLD_OUT) {
          subtotal += item.priceAtOrderTime * item.quantity;
        }
      });
    }
  });


  // Basic tax calculation (e.g., 10%) - make this configurable later
  const taxRate = 0.10;
  const tax = subtotal * taxRate;
  // For now, no discount logic
  const discount = 0.00;
  const total = subtotal + tax - discount;

  return {
    subtotalAmount: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(tax.toFixed(2)),
    discountAmount: parseFloat(discount.toFixed(2)),
    totalAmount: parseFloat(total.toFixed(2)),
  };
};

export const generateBillForSession = async (sessionId, staffId) => {
  // Fetch outside transaction or as first step in tx if other operations need to be atomic with it.
  // For upsert, the main atomicity is on the bill table itself.
  const diningSession = await prisma.diningSession.findUnique({
    where: { id: sessionId },
    include: {
      orders: { // Ensure you fetch orders and items needed for calculateBillAmounts
        where: { status: { not: OrderStatus.CANCELLED } }, // Example filter
        include: {
            items: {
                where: { status: { notIn: [OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT] } }
            }
        }
      },
      // No need to include 'bill' here if upsert is based on diningSessionId
    },
  });

  if (!diningSession) throw new Error('Dining session not found.');
  if (diningSession.status === DiningSessionStatus.CLOSED) {
    throw new Error('Cannot generate/regenerate bill for a closed session.');
  }

  // Check if a PAID bill already exists for this session *before* attempting upsert.
  const existingPaidBill = await prisma.bill.findFirst({
      where: { diningSessionId: sessionId, status: BillStatus.PAID }
  });
  if (existingPaidBill) {
      throw new Error('Bill for this session is already paid and cannot be regenerated.');
  }

  const amounts = calculateBillAmounts(diningSession.orders);

  const bill = await prisma.bill.upsert({
    where: {
      diningSessionId: sessionId, // The unique constraint for finding/matching
    },
    update: { // If a bill for this diningSessionId exists, update these fields
      subtotalAmount: amounts.subtotalAmount,
      taxAmount: amounts.taxAmount,
      discountAmount: amounts.discountAmount,
      totalAmount: amounts.totalAmount,
      staffIdGeneratedBy: staffId,
      generationTime: new Date(),
      status: BillStatus.UNPAID, // Always reset to UNPAID on generate/regenerate
    },
    create: { // If no bill for this diningSessionId exists, create with these fields
      diningSessionId: sessionId,
      staffIdGeneratedBy: staffId,
      subtotalAmount: amounts.subtotalAmount,
      taxAmount: amounts.taxAmount,
      discountAmount: amounts.discountAmount,
      totalAmount: amounts.totalAmount,
      status: BillStatus.UNPAID,
    },
  });

  // Update dining session status to BILLED if it's not already (and not closed)
  if (diningSession.status !== DiningSessionStatus.BILLED && diningSession.status !== DiningSessionStatus.CLOSED) {
    await prisma.diningSession.update({
      where: { id: sessionId },
      data: { status: DiningSessionStatus.BILLED },
    });
  }

  // Re-fetch the bill with all includes for a consistent API response
  return prisma.bill.findUnique({
      where: { id: bill.id }, // Use the ID from the upserted/created bill
      include: {
          diningSession: {
              include: {
                  table: { select: { id: true, tableNumber: true }},
                  orders: {
                      include: {
                          items: {
                              include: { menuItem: { select: { id: true, name: true, price: true }} }
                          }
                      }
                  }
              }
          },
          generatedBy: { select: {id: true, name: true}}
      }
  });
};
export const getBillById = async (billId) => {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      diningSession: {
        include: {
          table: true,
          orders: { include: { items: { include: { menuItem: true } } } },
          reservation: { include: { customer: true } },
        },
      },
      generatedBy: { select: { id: true, name: true } },
    },
  });
  if (!bill) throw new Error('Bill not found');
  return bill;
};

export const getBillBySessionId = async (sessionId) => {
    const bill = await prisma.bill.findUnique({
        where: { diningSessionId: sessionId }, // Since diningSessionId is unique on Bill
        include: {
            diningSession: {
                include: {
                    table: true,
                    orders: { include: { items: { include: { menuItem: true } } } },
                }
            },
            generatedBy: { select: { id: true, name: true } },
        }
    });
    // if (!bill) throw new Error('Bill not found for this session'); // Or return null if it's okay for no bill yet
    return bill;
}


export const confirmPaymentForBill = async (billId, paymentDetails, staffId) => {
  const { paymentMethod, notes } = paymentDetails;

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({
      where: { id: billId },
      include: { diningSession: { select: { id: true, tableId: true, reservationId: true } } }
    });

    if (!bill) throw new Error('Bill not found.');
    if (bill.status === BillStatus.PAID) {
      throw new Error('Bill is already marked as paid.');
    }
    if (bill.status === BillStatus.VOID) {
      throw new Error('Cannot pay a voided bill.');
    }

    const updatedBill = await tx.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.PAID,
        paymentConfirmationTime: new Date(),
        paymentMethod: paymentMethod || null,
        notes: notes || bill.notes, // Append to existing notes or replace
      },
    });

    // Close the dining session
    const updatedSession = await tx.diningSession.update({
      where: { id: bill.diningSessionId },
      data: {
        status: DiningSessionStatus.CLOSED,
        endTime: new Date(),
      },
    });

    // Update table status
    await tx.table.update({
      where: { id: bill.diningSession.tableId }, // Use tableId from fetched session
      data: { status: TableStatus.AVAILABLE }, // Or NEEDS_CLEANING
    });

    // Update linked reservation status to COMPLETED
    if (bill.diningSession.reservationId) { // Check if reservationId exists on the fetched session
      await tx.reservation.update({
        where: { id: bill.diningSession.reservationId },
        data: { status: ReservationStatus.COMPLETED }
      });
    }
    return updatedBill; // Or return a more comprehensive object
  });
};