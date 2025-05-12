// ./backend/src/services/billingService.js
import prisma from '../db/prismaClient.js';
import { BillStatus, DiningSessionStatus, OrderStatus, OrderItemStatus, TableStatus } from '@prisma/client';

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
  return prisma.$transaction(async (tx) => {
    const diningSession = await tx.diningSession.findUnique({
      where: { id: sessionId },
      include: {
          orders: {
              // Fetch all orders that are not CANCELLED to consider for billing
              where: { status: { not: OrderStatus.CANCELLED } },
              include: {
                  items: {
                      // Fetch all items that are not CANCELLED or SOLD_OUT for calculation
                      where: { status: { notIn: [OrderItemStatus.CANCELLED, OrderItemStatus.SOLD_OUT] } }
                  }
              }
          },
          bill: true
      },
  });

    if (!diningSession) throw new Error('Dining session not found.');
    if (diningSession.status === DiningSessionStatus.CLOSED) {
      throw new Error('Cannot generate bill for a closed session.');
    }
    if (diningSession.bill && diningSession.bill.status === BillStatus.PAID) {
      throw new Error('Bill for this session is already paid.');
    }

    if (!diningSession.orders || diningSession.orders.filter(o => o.status !== OrderStatus.CANCELLED && o.items.length > 0).length === 0) {
      console.warn(`Attempting to generate bill for session ${sessionId} with no billable orders.`);
    }

    const amounts = calculateBillAmounts(diningSession.orders);

    let bill;
    if (diningSession.bill) { // Bill exists, update it (e.g. if more items were added)
      bill = await tx.bill.update({
        where: { id: diningSession.bill.id },
        data: {
          ...amounts,
          staffIdGeneratedBy: staffId, // Update who last generated/updated it
          generationTime: new Date(), // Update generation time
          status: BillStatus.UNPAID, // Reset to unpaid if re-generating
        },
      });
    } else { // Create a new bill
      bill = await tx.bill.create({
        data: {
          diningSessionId: sessionId,
          staffIdGeneratedBy: staffId,
          ...amounts,
          status: BillStatus.UNPAID,
        },
      });
    }

    // Update dining session status to BILLED
    await tx.diningSession.update({
      where: { id: sessionId },
      data: { status: DiningSessionStatus.BILLED },
    });

    return tx.bill.findUnique({ // Re-fetch with includes
        where: { id: bill.id },
        include: { diningSession: { include: { table: true, orders: {include: { items: {include: {menuItem:true}}}}} }}
    });
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
      include: { diningSession: true }
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

    // Update table status to AVAILABLE (or NEEDS_CLEANING)
    await tx.table.update({
      where: { id: updatedSession.tableId },
      data: { status: TableStatus.AVAILABLE }, // Or NEEDS_CLEANING
    });

    return updatedBill;
  });
};

// voidBill function might be needed later