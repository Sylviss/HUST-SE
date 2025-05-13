// ./frontend/src/store/slices/staffSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

// Thunk to fetch all staff members
export const fetchStaffMembers = createAsyncThunk(
  'staff/fetchStaffMembers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/staff'); // Assumes backend endpoint
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch staff');
    }
  }
);

// Thunk to create a new staff member
export const createStaffMember = createAsyncThunk(
  'staff/createStaffMember',
  async (staffData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/staff', staffData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create staff member');
    }
  }
);

// Thunk to update a staff member
export const updateStaffMember = createAsyncThunk(
  'staff/updateStaffMember',
  async ({ staffId, staffData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/staff/${staffId}`, staffData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update staff member');
    }
  }
);

// Thunk to toggle active status (activate/deactivate)
export const toggleStaffActiveStatus = createAsyncThunk(
  'staff/toggleStaffActiveStatus',
  async ({ staffId, isActive }, { rejectWithValue }) => {
    try {
      // Assuming backend uses a PATCH or dedicated endpoints like /activate, /deactivate
      // For simplicity, let's assume PUT /staff/:staffId can update 'isActive'
      // Or, if you have PATCH /staff/:staffId/status { isActive: true/false }
      const response = await apiClient.put(`/staff/${staffId}`, { isActive });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update staff status');
    }
  }
);


const initialState = {
  members: [],
  isLoading: false,
  isSubmitting: false, // For create/update actions
  error: null,
  submitError: null,
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearStaffError: (state) => { state.error = null; },
    clearStaffSubmitError: (state) => { state.submitError = null; },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Staff Members
      .addCase(fetchStaffMembers.pending, (state) => {
        state.isLoading = true; state.error = null;
      })
      .addCase(fetchStaffMembers.fulfilled, (state, action) => {
        state.isLoading = false; state.members = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchStaffMembers.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload; state.members = [];
      })
      // Create Staff Member
      .addCase(createStaffMember.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(createStaffMember.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.members.push(action.payload); // Add new member to list
         state.members.sort((a,b) => a.name.localeCompare(b.name));
      })
      .addCase(createStaffMember.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      // Update Staff Member & Toggle Status (they both update an item in the list)
      .addCase(updateStaffMember.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(updateStaffMember.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.members.findIndex(mem => mem.id === action.payload.id);
        if (index !== -1) state.members[index] = action.payload;
         state.members.sort((a,b) => a.name.localeCompare(b.name));
      })
      .addCase(updateStaffMember.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      })
      .addCase(toggleStaffActiveStatus.pending, (state) => {
        state.isSubmitting = true; state.submitError = null;
      })
      .addCase(toggleStaffActiveStatus.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.members.findIndex(mem => mem.id === action.payload.id);
        if (index !== -1) state.members[index] = action.payload;
      })
      .addCase(toggleStaffActiveStatus.rejected, (state, action) => {
        state.isSubmitting = false; state.submitError = action.payload;
      });
  },
});

export const { clearStaffError, clearStaffSubmitError } = staffSlice.actions;
export default staffSlice.reducer;