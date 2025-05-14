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
        endpoint = '/menu-items?availableOnly=' + (params.availableOnly !== false); // Default to true
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

export const createMenuItem = createAsyncThunk(
  'menuItems/createMenuItem',
  async (menuItemData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/menu-items', menuItemData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create menu item';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to update an existing menu item ---
export const updateMenuItem = createAsyncThunk(
  'menuItems/updateMenuItem',
  async ({ itemId, menuItemData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/menu-items/${itemId}`, menuItemData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update menu item';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to delete a menu item ---
export const deleteMenuItem = createAsyncThunk(
  'menuItems/deleteMenuItem',
  async (itemId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/menu-items/${itemId}`);
      return itemId; // Return the ID of the deleted item for reducer
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete menu item';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Thunk to update item availability ---
export const updateMenuItemAvailability = createAsyncThunk(
  'menuItems/updateMenuItemAvailability',
  async ({ itemId, isAvailable }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/menu-items/${itemId}/availability`, { isAvailable });
      return response.data; // Expects the updated menuItem back
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update item availability';
      return rejectWithValue(errorMessage);
    }
  }
);


const initialState = {
  items: [],
  isLoading: false, // For fetching list
  isSubmitting: false, // For CUD operations
  error: null,
  submitError: null, // Separate error for CUD
};

const menuItemSlice = createSlice({
  name: 'menuItems',
  initialState,
  reducers: {
    clearMenuItemError: (state) => {
        state.error = null;
    },
    clearMenuItemSubmitError: (state) => {
        state.submitError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Menu Items
      .addCase(fetchMenuItems.pending, (state) => {
        state.isLoading = true; state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.isLoading = false; state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload;
      })
      // Create Menu Item
      .addCase(createMenuItem.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(createMenuItem.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items.unshift(action.payload); // Add to beginning of list
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      // Update Menu Item & Availability
      .addCase(updateMenuItem.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      .addCase(updateMenuItemAvailability.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(updateMenuItemAvailability.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload; // Replace with updated item from backend
        }
      })
      .addCase(updateMenuItemAvailability.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload;
      })
      // Delete Menu Item
      .addCase(deleteMenuItem.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => { // action.payload is itemId
        state.isSubmitting = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      });
  },
});

export const { clearMenuItemError, clearMenuItemSubmitError } = menuItemSlice.actions;
export default menuItemSlice.reducer;