// ./frontend/src/store/slices/menuItemSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

// Thunk to fetch all menu items (could be all for manager, or only available for others)
export const fetchMenuItems = createAsyncThunk(
  'menuItems/fetchMenuItems',
  async (params = { availableOnly: true }, { getState, rejectWithValue }) => {
    try {
      let endpoint = '/menu-items'; // Default for generally available items
      const { auth } = getState(); // Get auth state
      const isUserAManager = auth.staff?.role === 'MANAGER'; // Assuming role is stored in auth.staff

      if (params.allForManager && isUserAManager) { // Check if manager and if allForManager is requested
        endpoint = '/menu-items/all-for-admin'; // MATCHES NEW BACKEND ROUTE
      } else { // Default public/non-manager view or specific filter
        endpoint = '/menu-items?availableOnly=true'; // Ensure this param is handled by backend
      }
      // console.log('Fetching menu items from endpoint:', endpoint, 'with params:', params);
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch menu items';
      return rejectWithValue(errorMessage);
    }
  }
);

// Thunks for CRUD operations (Manager only)
export const createMenuItem = createAsyncThunk( /* ... */ ); // To be implemented
export const updateMenuItem = createAsyncThunk( /* ... */ ); // To be implemented
export const deleteMenuItem = createAsyncThunk( /* ... */ ); // To be implemented

const initialState = {
  items: [],
  isLoading: false,
  error: null,
};

const menuItemSlice = createSlice({
  name: 'menuItems',
  initialState,
  reducers: {
    clearMenuItemError: (state) => {
        state.error = null;
    }
    // Add reducers for local updates after CRUD if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
    // Add cases for createMenuItem, updateMenuItem, deleteMenuItem later
  },
});

export const { clearMenuItemError } = menuItemSlice.actions;
export default menuItemSlice.reducer;