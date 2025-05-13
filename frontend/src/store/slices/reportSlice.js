// ./frontend/src/store/slices/reportSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export const fetchRevenueReport = createAsyncThunk(
  'reports/fetchRevenueReport',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/reports/revenue', { params: { startDate, endDate } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch revenue report');
    }
  }
);

export const fetchPopularItemsReport = createAsyncThunk(
  'reports/fetchPopularItemsReport',
  async ({ startDate, endDate, limit }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/reports/popular-items', { params: { startDate, endDate, limit } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch popular items report');
    }
  }
);

const initialState = {
  revenueReport: null,
  popularItemsReport: [],
  isLoading: false,
  error: null,
};

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportError: (state) => { state.error = null; },
    clearReports: (state) => {
        state.revenueReport = null;
        state.popularItemsReport = [];
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Revenue Report
      .addCase(fetchRevenueReport.pending, (state) => {
        state.isLoading = true; state.error = null; state.revenueReport = null;
      })
      .addCase(fetchRevenueReport.fulfilled, (state, action) => {
        state.isLoading = false; state.revenueReport = action.payload;
      })
      .addCase(fetchRevenueReport.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload;
      })
      // Popular Items Report
      .addCase(fetchPopularItemsReport.pending, (state) => {
        state.isLoading = true; state.error = null; state.popularItemsReport = [];
      })
      .addCase(fetchPopularItemsReport.fulfilled, (state, action) => {
        state.isLoading = false; state.popularItemsReport = action.payload;
      })
      .addCase(fetchPopularItemsReport.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload;
      });
  },
});

export const { clearReportError, clearReports } = reportSlice.actions;
export default reportSlice.reducer;