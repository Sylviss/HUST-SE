// ./frontend/src/store/slices/tableSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

// --- fetchTables (existing) ---
export const fetchTables = createAsyncThunk(
  'tables/fetchTables',
  async (filters = {}, { rejectWithValue }) => { // Added filters capability
    try {
      const response = await apiClient.get('/tables', { params: filters });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch tables';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to create a new table ---
export const createTable = createAsyncThunk(
  'tables/createTable',
  async (tableData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/tables', tableData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create table';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to update an existing table ---
export const updateTable = createAsyncThunk(
  'tables/updateTable',
  async ({ tableId, tableData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/tables/${tableId}`, tableData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update table';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to update table status ---
export const updateTableStatus = createAsyncThunk(
  'tables/updateTableStatus',
  async ({ tableId, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/tables/${tableId}/status`, { status });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update table status';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to delete a table ---
export const deleteTable = createAsyncThunk(
  'tables/deleteTable',
  async (tableId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/tables/${tableId}`);
      return tableId; // Return the ID of the deleted table
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete table';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  submitError: null,
};

const tableSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {
    clearTableError: (state) => {
        state.error = null;
    },
    clearTableSubmitError: (state) => {
        state.submitError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tables
      .addCase(fetchTables.pending, (state) => {
        state.isLoading = true; state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.isLoading = false; state.items = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload;
      })
      // Create Table
      .addCase(createTable.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(createTable.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items.push(action.payload); // Add to list (or refetch)
         // Sort by tableNumber after adding
        state.items.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
      })
      .addCase(createTable.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      // Update Table & Update Table Status (share similar state updates)
      .addCase(updateTable.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(updateTable.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
        state.items.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
      })
      .addCase(updateTable.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      .addCase(updateTableStatus.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(updateTableStatus.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateTableStatus.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      // Delete Table
      .addCase(deleteTable.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(deleteTable.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteTable.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      });
  },
});

export const { clearTableError, clearTableSubmitError } = tableSlice.actions;
export default tableSlice.reducer;