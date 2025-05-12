// ./frontend/src/store/slices/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';
import { OrderStatus, OrderItemStatus } from '../../utils/constants'; // Ensure enums are correctly imported

// Thunk to create an order for a session
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async ({ sessionId, itemsData, notes }, { rejectWithValue }) => {
    try {
      const payload = { items: itemsData, notes };
      const response = await apiClient.post(`/dining-sessions/${sessionId}/orders`, payload);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create order';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk for fetching orders for a specific session
export const fetchOrdersForSession = createAsyncThunk(
    'orders/fetchOrdersForSession',
    async (sessionId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`/dining-sessions/${sessionId}/orders`);
            return { sessionId, orders: response.data };
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch orders for session';
            return rejectWithValue(errorMessage);
        }
    }
);

// Thunk to fetch orders specifically for the kitchen display
export const fetchKitchenOrders = createAsyncThunk(
  'orders/fetchKitchenOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/orders', {
        params: { status: `${OrderStatus.PENDING},${OrderStatus.PREPARING}` }
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch kitchen orders';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk to update an order's overall status
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update order status';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk to update an individual order item's status
export const updateOrderItemStatus = createAsyncThunk(
  'orders/updateOrderItemStatus',
  async ({ orderItemId, status, reason = null }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/order-items/${orderItemId}/status`, { status, reason });
      return response.data; // This should be the updated OrderItem
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update order item status';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchReadyToServeOrders = createAsyncThunk(
  'orders/fetchReadyToServeOrders',
  async (_, { rejectWithValue }) => {
    try {
      // Fetches orders with status READY
      const response = await apiClient.get('/orders', {
        params: { status: OrderStatus.READY } // Assumes backend supports this
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch ready orders';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  ordersBySession: {},    // Stores orders keyed by sessionId: { sessionId: [order1, order2] }
  kitchenOrders: [],      // Stores orders for the KDS (PENDING, PREPARING)
  currentOrderDetails: null, // For viewing a specific order's details
  isLoadingList: false,      // For fetching list of orders for a session
  listError: null,
  isLoadingKitchen: false,   // For fetching kitchenOrders
  kitchenError: null,
  isSubmitting: false,       // For createOrder thunk
  submitError: null,
  isUpdatingStatus: false,   // For updateOrderStatus and updateOrderItemStatus thunks
  statusUpdateError: null,
  readyToServeOrders: [],
  isLoadingReadyToServe: false,
  readyToServeError: null,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderSubmitError: (state) => { state.submitError = null; },
    clearOrderListError: (state) => { state.listError = null; },
    clearKitchenOrderError: (state) => { state.kitchenError = null; },
    clearOrderStatusUpdateError: (state) => { state.statusUpdateError = null; },
    clearReadyToServeError: (state) => { state.readyToServeError = null; },
    // This local reducer can be used for immediate UI feedback if desired,
    // but the thunk's fulfilled case will also update the state.
    updateLocalOrderItemStatus: (state, action) => {
        const { orderId, orderItemId, newStatus } = action.payload;
        const orderToUpdateInKitchen = state.kitchenOrders.find(order => order.id === orderId);
        if (orderToUpdateInKitchen) {
            const itemIndex = orderToUpdateInKitchen.items.findIndex(item => item.id === orderItemId);
            if (itemIndex !== -1) {
                orderToUpdateInKitchen.items[itemIndex].status = newStatus;
            }
        }
        // Also update in ordersBySession if the order exists there
        const sessionEntries = Object.values(state.ordersBySession).flat();
        const orderToUpdateInSession = sessionEntries.find(order => order.id === orderId);
         if (orderToUpdateInSession) {
            const itemIndex = orderToUpdateInSession.items.findIndex(item => item.id === orderItemId);
            if (itemIndex !== -1) {
                orderToUpdateInSession.items[itemIndex].status = newStatus;
            }
        }
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const newOrder = action.payload;
        const sessionId = newOrder.diningSessionId;
        if (!state.ordersBySession[sessionId]) {
          state.ordersBySession[sessionId] = [];
        }
        state.ordersBySession[sessionId].push(newOrder);
        // If new order is PENDING/PREPARING, add to kitchenOrders as well
        if (newOrder.status === OrderStatus.PENDING || newOrder.status === OrderStatus.PREPARING) {
            const kitchenIndex = state.kitchenOrders.findIndex(o => o.id === newOrder.id);
            if (kitchenIndex === -1) { // Avoid duplicates if already there (shouldn't happen with new order)
                state.kitchenOrders.push(newOrder);
                state.kitchenOrders.sort((a, b) => new Date(a.orderTime) - new Date(b.orderTime)); // Keep sorted
            }
        }
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })

      // Fetch Orders for Session
      .addCase(fetchOrdersForSession.pending, (state) => {
        state.isLoadingList = true; state.listError = null;
      })
      .addCase(fetchOrdersForSession.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.ordersBySession[action.payload.sessionId] = Array.isArray(action.payload.orders) ? action.payload.orders : [];
      })
      .addCase(fetchOrdersForSession.rejected, (state, action) => {
        state.isLoadingList = false; state.listError = action.payload;
      })

      // Fetch Kitchen Orders
      .addCase(fetchKitchenOrders.pending, (state) => {
        state.isLoadingKitchen = true; state.kitchenError = null;
      })
      .addCase(fetchKitchenOrders.fulfilled, (state, action) => {
        state.isLoadingKitchen = false;
        state.kitchenOrders = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchKitchenOrders.rejected, (state, action) => {
        state.isLoadingKitchen = false;
        state.kitchenError = action.payload;
        state.kitchenOrders = [];
      })

      // Update Order Status
      .addCase(updateOrderStatus.pending, (state) => {
        state.isUpdatingStatus = true; state.statusUpdateError = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.isUpdatingStatus = false;
        const updatedOrder = action.payload;
        // Update in kitchenOrders list
        let kIndex = state.kitchenOrders.findIndex(o => o.id === updatedOrder.id);
        if (kIndex !== -1) {
          // Remove from KDS if status is no longer PENDING or PREPARING
          if (updatedOrder.status === OrderStatus.READY || updatedOrder.status === OrderStatus.SERVED || updatedOrder.status === OrderStatus.CANCELLED) {
            state.kitchenOrders.splice(kIndex, 1);
          } else {
            state.kitchenOrders[kIndex] = updatedOrder;
          }
        } else if (updatedOrder.status === OrderStatus.PENDING || updatedOrder.status === OrderStatus.PREPARING) {
            // If it became PENDING/PREPARING again (e.g. from ACTION_REQUIRED) and wasn't in list, add it back
            state.kitchenOrders.push(updatedOrder);
            state.kitchenOrders.sort((a, b) => new Date(a.orderTime) - new Date(b.orderTime));
        }

        // Update in ordersBySession if present
        if (updatedOrder.diningSessionId && state.ordersBySession[updatedOrder.diningSessionId]) {
          let sIndex = state.ordersBySession[updatedOrder.diningSessionId].findIndex(o => o.id === updatedOrder.id);
          if (sIndex !== -1) {
            state.ordersBySession[updatedOrder.diningSessionId][sIndex] = updatedOrder;
          } else {
             // If not found, but belongs to this session, add it (could happen if list wasn't up-to-date)
             state.ordersBySession[updatedOrder.diningSessionId].push(updatedOrder);
          }
        }
        if (updatedOrder.status === OrderStatus.SERVED) {
          state.readyToServeOrders = state.readyToServeOrders.filter(o => o.id !== updatedOrder.id);
        } else if (updatedOrder.status === OrderStatus.READY) {
          // If it became READY (e.g. from another status not PENDING/PREPARING), add/update it
          const rIndex = state.readyToServeOrders.findIndex(o => o.id === updatedOrder.id);
          if (rIndex !== -1) {
            state.readyToServeOrders[rIndex] = updatedOrder;
          } else {
            state.readyToServeOrders.push(updatedOrder);
            state.readyToServeOrders.sort((a, b) => new Date(a.orderTime) - new Date(b.orderTime));
          }
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.isUpdatingStatus = false; state.statusUpdateError = action.payload;
      })

      // Update Order Item Status
      .addCase(updateOrderItemStatus.pending, (state) => {
        state.isUpdatingStatus = true; state.statusUpdateError = null;
      })
      .addCase(updateOrderItemStatus.fulfilled, (state, action) => {
        state.isUpdatingStatus = false;
        const updatedItem = action.payload; // This is the updated OrderItem
        const orderId = updatedItem.orderId;

        const updateItemInOrderList = (orderList) => {
            const orderInList = orderList.find(o => o.id === orderId);
            if (orderInList && orderInList.items) {
                const itemIndex = orderInList.items.findIndex(i => i.id === updatedItem.id);
                if (itemIndex !== -1) {
                    // Make sure to preserve other item details if not all are returned in updatedItem
                    orderInList.items[itemIndex] = { ...orderInList.items[itemIndex], ...updatedItem };
                }
                // If the item update implies the parent order's status might change
                // (e.g., all items now READY), we need to update the parent order object fully.
                // The simplest is to find the parent order and update its item.
                // A full re-fetch of this specific order would be more robust here if parent status also changed.
            }
        };

        updateItemInOrderList(state.kitchenOrders);
        for (const sessionId in state.ordersBySession) {
            updateItemInOrderList(state.ordersBySession[sessionId]);
        }
        // To ensure the parent Order object (including its overall status and table info)
        // is correctly updated after an item change, we might need to refetch the specific order
        // or ensure the backend API for updating an item returns the full updated parent order.
        // For now, this updates the item. If order status changes server-side,
        // fetchKitchenOrders will eventually pick it up, or a direct fetch of that order is needed.
      })
      .addCase(updateOrderItemStatus.rejected, (state, action) => {
        state.isUpdatingStatus = false; state.statusUpdateError = action.payload;
      })
      .addCase(fetchReadyToServeOrders.pending, (state) => {
        state.isLoadingReadyToServe = true;
        state.readyToServeError = null;
      })
      .addCase(fetchReadyToServeOrders.fulfilled, (state, action) => {
        state.isLoadingReadyToServe = false;
        state.readyToServeOrders = action.payload;
      })
      .addCase(fetchReadyToServeOrders.rejected, (state, action) => {
        state.isLoadingReadyToServe = false;
        state.readyToServeError = action.payload;
        state.readyToServeOrders = [];
      })
  },
});

export const {
  clearOrderSubmitError,
  clearOrderListError,
  clearKitchenOrderError,
  clearOrderStatusUpdateError,
  updateLocalOrderItemStatus,
  clearReadyToServeError
} = orderSlice.actions;

export default orderSlice.reducer;