// ./frontend/src/store/slices/billSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';
import { fetchDiningSessionById } from './diningSessionSlice'; // To refresh session state
import { fetchTables } from './tableSlice'; // To refresh table state

// Thunk to generate/fetch a bill for a session
export const generateOrFetchBillForSession = createAsyncThunk(
  'bills/generateOrFetchBillForSession',
  async (sessionId, { dispatch, rejectWithValue }) => {
    try {
      // First, try to get the bill if it exists
      try {
        const getResponse = await apiClient.get(`/dining-sessions/${sessionId}/bill`);
        if (getResponse.data && getResponse.data.id) { // Check if a bill object is returned
          return getResponse.data;
        }
      } catch (error) {
        // If 404 (no bill exists), proceed to generate.
        // Any other error should be propagated.
        if (error.response?.status !== 404) {
          throw error; // Re-throw if it's not a "bill not found" error
        }
      }
      // If no bill exists (or GET failed with 404), generate it
      const postResponse = await apiClient.post(`/dining-sessions/${sessionId}/bill`);
      return postResponse.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate/fetch bill';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunk to confirm payment for a bill
export const confirmPayment = createAsyncThunk(
  'bills/confirmPayment',
  async ({ billId, paymentDetails }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/bills/${billId}/pay`, paymentDetails);
      // After payment, refresh related data
      if (response.data && response.data.diningSessionId) {
        dispatch(fetchDiningSessionById(response.data.diningSessionId)); // Refresh session
        // Find tableId from session to refresh table (could be more direct if API returns it)
        // For now, just refetch all tables, or enhance later
        dispatch(fetchTables());
      }
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to confirm payment';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  currentBill: null,
  isLoading: false, // For fetching/generating bill
  isProcessingPayment: false,
  error: null,
  paymentError: null,
};

const billSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {
    clearBillError: (state) => { state.error = null; },
    clearPaymentError: (state) => { state.paymentError = null; },
    clearCurrentBill: (state) => {
        state.currentBill = null;
        state.isLoading = false;
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Generate/Fetch Bill
      .addCase(generateOrFetchBillForSession.pending, (state) => {
        state.isLoading = true; state.error = null; state.currentBill = null;
      })
      .addCase(generateOrFetchBillForSession.fulfilled, (state, action) => {
        state.isLoading = false; state.currentBill = action.payload;
      })
      .addCase(generateOrFetchBillForSession.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload; state.currentBill = null;
      })
      // Confirm Payment
      .addCase(confirmPayment.pending, (state) => {
        state.isProcessingPayment = true; state.paymentError = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.isProcessingPayment = false;
        state.currentBill = action.payload; // Update current bill with PAID status
        // Potentially update lists of active sessions/tables elsewhere via their own fetches
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.isProcessingPayment = false; state.paymentError = action.payload;
      });
  },
});

export const { clearBillError, clearPaymentError, clearCurrentBill } = billSlice.actions;
export default billSlice.reducer;