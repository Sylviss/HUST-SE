// ./backend/src/services/reportService.js
import prisma from '../db/prismaClient.js';
import { BillStatus, OrderStatus, OrderItemStatus } from '@prisma/client';

export const getRevenueReport = async (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required for revenue report.');
  }

  const sDate = new Date(startDate);
  sDate.setHours(0, 0, 0, 0); // Start of the day
  const eDate = new Date(endDate);
  eDate.setHours(23, 59, 59, 999); // End of the day

  const result = await prisma.bill.aggregate({
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true, // Count of bills
    },
    where: {
      status: BillStatus.PAID,
      paymentConfirmationTime: { // Use paymentConfirmationTime for accuracy
        gte: sDate,
        lte: eDate,
      },
    },
  });

  return {
    startDate: sDate.toISOString().split('T')[0],
    endDate: eDate.toISOString().split('T')[0],
    totalRevenue: result._sum.totalAmount || 0,
    numberOfPaidBills: result._count.id || 0,
    averageBillValue: (result._count.id && result._sum.totalAmount) ? (result._sum.totalAmount / result._count.id) : 0,
  };
};

export const getPopularItemsReport = async (startDate, endDate, limit = 10) => {
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required for popular items report.');
  }
  const sDate = new Date(startDate);
  sDate.setHours(0, 0, 0, 0);
  const eDate = new Date(endDate);
  eDate.setHours(23, 59, 59, 999);

  const popularItems = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: {
      quantity: true,
    },
    where: {
      // Consider only items from SERVED orders for "popularity"
      // Or include READY if that also counts as a "sale" for this report
      status: { in: [OrderItemStatus.SERVED, OrderItemStatus.READY] },
      order: {
        // Ensure the order itself wasn't cancelled and falls within date range
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.ACTION_REQUIRED] }, // Consider if ACTION_REQUIRED should be excluded
        orderTime: { // Or use order.diningSession.startTime/endTime if more accurate for sale period
          gte: sDate,
          lte: eDate,
        }
      }
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  // Fetch menu item names for the popular items
  if (popularItems.length > 0) {
    const menuItemIds = popularItems.map(item => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
      },
      select: {
        id: true,
        name: true,
        price: true, // Current price, for reference
      },
    });
    const menuItemMap = new Map(menuItems.map(item => [item.id, item]));

    return popularItems.map(item => ({
      menuItemId: item.menuItemId,
      name: menuItemMap.get(item.menuItemId)?.name || 'Unknown Item',
      currentPrice: menuItemMap.get(item.menuItemId)?.price,
      totalQuantitySold: item._sum.quantity || 0,
    }));
  }
  return [];
};

// Add other report functions here later:
// - Table Turnover
// - Staff Performance (e.g., orders taken, total sales by staff)
// - Reservation Statistics (e.g., confirmed vs. no-show)