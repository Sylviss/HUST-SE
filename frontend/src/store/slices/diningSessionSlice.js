// ./frontend/src/store/slices/diningSessionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';
// Assuming DiningSessionStatus might be needed for filtering types if used
import { DiningSessionStatus } from '../../utils/constants';

export const startDiningSession = createAsyncThunk(
  'diningSessions/startDiningSession',
  async ({ sessionData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/dining-sessions', sessionData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start dining session';
      console.error('SLICE_THUNK: Start session API Error:', errorMessage, error.response);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchDiningSessionById = createAsyncThunk(
  'diningSessions/fetchDiningSessionById',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/dining-sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dining session details';
      console.error('SLICE_THUNK: Fetch session by ID API Error:', errorMessage, error.response);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAllDiningSessions = createAsyncThunk(
    'diningSessions/fetchAllDiningSessions',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/dining-sessions', { params: filters });

            if (Array.isArray(response.data)) {
                return response.data;
            } else {
                // This case should ideally not happen if your backend is consistent
                console.error('SLICE_THUNK: API Response (ALL) is NOT an array:', response.data);
                return rejectWithValue('API response for all sessions was not an array');
            }
        } catch (error) {
             const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dining sessions';
             console.error('SLICE_THUNK: API Error for ALL /dining-sessions:', errorMessage, error.response); // Log 3
            return rejectWithValue(errorMessage);
        }
    }
);

// Placeholder for closeDiningSession if you implement it later
// export const closeDiningSession = createAsyncThunk( ... );

const initialState = {
  list: [],
  isLoadingList: false,
  listError: null,
  currentSession: null,
  isLoadingCurrent: false,
  currentError: null,
  isSubmitting: false, // For actions like start/close session
  submitError: null,
};

const diningSessionSlice = createSlice({
  name: 'diningSessions',
  initialState,
  reducers: {
    clearSessionSubmitError: (state) => {
      state.submitError = null;
    },
    clearSessionCurrentError: (state) => {
        state.currentError = null;
    },
    clearSessionListError: (state) => {
        state.listError = null;
    },
    clearCurrentSession: (state) => {
        state.currentSession = null;
        state.isLoadingCurrent = false;
        state.currentError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Start Dining Session
      .addCase(startDiningSession.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(startDiningSession.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.currentSession = action.payload;
        state.submitError = null;
        const index = state.list.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
            state.list[index] = action.payload;
        } else {
            state.list.push(action.payload);
        }
      })
      .addCase(startDiningSession.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload;
      })

      // Fetch Single Dining Session By ID
      .addCase(fetchDiningSessionById.pending, (state) => {
        state.isLoadingCurrent = true;
        state.currentError = null;
        state.currentSession = null;
      })
      .addCase(fetchDiningSessionById.fulfilled, (state, action) => {
        state.isLoadingCurrent = false;
        state.currentSession = action.payload;
      })
      .addCase(fetchDiningSessionById.rejected, (state, action) => {
        state.isLoadingCurrent = false;
        state.currentError = action.payload;
        state.currentSession = null;
      })

      // Fetch All Dining Sessions (List)
      .addCase(fetchAllDiningSessions.pending, (state) => {
        state.isLoadingList = true;
        state.listError = null;
      })
      .addCase(fetchAllDiningSessions.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.list = Array.isArray(action.payload) ? action.payload : []; // Ensure it's an array
      })
      .addCase(fetchAllDiningSessions.rejected, (state, action) => {
        state.isLoadingList = false;
        state.listError = action.payload;
        state.list = [];
      });
      // Add .addCase for closeDiningSession when you create that thunk
  },
});

export const {
    clearSessionSubmitError,
    clearSessionCurrentError,
    clearSessionListError,
    clearCurrentSession
} = diningSessionSlice.actions;

export default diningSessionSlice.reducer;