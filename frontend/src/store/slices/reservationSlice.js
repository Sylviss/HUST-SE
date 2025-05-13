// ./frontend/src/store/slices/reservationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

// Thunk to fetch reservations
export const fetchReservations = createAsyncThunk(
  'reservations/fetchReservations',
  async (filters = {}, { rejectWithValue }) => {
    // filters: { date: 'YYYY-MM-DD', status: 'PENDING' }
    try {
      const response = await apiClient.get('/reservations', { params: filters });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch reservations';
      return rejectWithValue(errorMessage);
    }
  }
);

export const markAsNoShow = createAsyncThunk(
  'reservations/markAsNoShow',
  async (reservationId, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/reservations/${reservationId}/no-show`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to mark as no-show';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk to confirm a reservation
export const confirmReservation = createAsyncThunk(
  'reservations/confirmReservation',
  async ({ reservationId, tableId }, { rejectWithValue }) => { // tableId is optional
    try {
      const payload = tableId ? { tableId } : {};
      const response = await apiClient.patch(`/reservations/${reservationId}/confirm`, payload);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to confirm reservation';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk to cancel a reservation
export const cancelReservation = createAsyncThunk(
  'reservations/cancelReservation',
  async (reservationId, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/reservations/${reservationId}/cancel`);
      return response.data; // Returns the updated (cancelled) reservation
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel reservation';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  isProcessingAction: false, // For confirm/cancel actions
  error: null,
  actionError: null,
};

const reservationSlice = createSlice({
  name: 'reservations',
  initialState,
  reducers: {
    clearReservationError: (state) => {
      state.error = null;
    },
    clearReservationActionError: (state) => {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Reservations
      .addCase(fetchReservations.pending, (state) => {
        state.isLoading = true; state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        state.isLoading = false; state.items = action.payload;
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload;
      })
      // Confirm Reservation
      .addCase(confirmReservation.pending, (state) => {
        state.isProcessingAction = true; state.actionError = null;
      })
      .addCase(confirmReservation.fulfilled, (state, action) => {
        state.isProcessingAction = false;
        const index = state.items.findIndex(res => res.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
        else state.items.push(action.payload); // Or refetch list
      })
      .addCase(confirmReservation.rejected, (state, action) => {
        state.isProcessingAction = false; state.actionError = action.payload;
      })
      // Cancel Reservation
      .addCase(cancelReservation.pending, (state) => {
        state.isProcessingAction = true; state.actionError = null;
      })
      .addCase(cancelReservation.fulfilled, (state, action) => {
        state.isProcessingAction = false;
        const index = state.items.findIndex(res => res.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
        // Or filter out if you prefer: state.items = state.items.filter(res => res.id !== action.payload.id);
      })
      .addCase(cancelReservation.rejected, (state, action) => {
        state.isProcessingAction = false; state.actionError = action.payload;
      })
      .addCase(markAsNoShow.pending, (state) => {
        state.isProcessingAction = true; state.actionError = null;
      })
      .addCase(markAsNoShow.fulfilled, (state, action) => {
        state.isProcessingAction = false;
        const index = state.items.findIndex(res => res.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(markAsNoShow.rejected, (state, action) => {
        state.isProcessingAction = false; state.actionError = action.payload;
      });
  },
});

export const { clearReservationError, clearReservationActionError } = reservationSlice.actions;
export default reservationSlice.reducer;