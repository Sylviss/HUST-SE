// ./frontend/src/utils/constants.js

export const StaffRole = {
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  CASHIER: 'CASHIER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
};

export const TableStatusEnum = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  NEEDS_CLEANING: 'NEEDS_CLEANING',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
};

export const ReservationStatusEnum = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  SEATED: 'SEATED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
};

export const DiningSessionStatus = {
  ACTIVE: 'ACTIVE',
  BILLED: 'BILLED',
  CLOSED: 'CLOSED',
};

// Add OrderStatus if not already present (used by KitchenDisplayPage)
export const OrderStatus = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  CANCELLED: 'CANCELLED',
  ACTION_REQUIRED: 'ACTION_REQUIRED', // If you use this for orders with sold-out items
};

// --- Add OrderItemStatus ---
export const OrderItemStatus = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  CANCELLED: 'CANCELLED',
  SOLD_OUT: 'SOLD_OUT', // For items kitchen cannot fulfill
};

export const BillStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  VOID: 'VOID',
};