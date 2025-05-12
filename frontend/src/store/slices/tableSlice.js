// ./frontend/src/store/slices/tableSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export const fetchTables = createAsyncThunk(
  'tables/fetchTables',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/tables'); // Assumes API endpoint exists
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch tables';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  error: null,
};

const tableSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {
    clearTableError: (state) => {
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTables.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});
export const { clearTableError } = tableSlice.actions;
export default tableSlice.reducer;