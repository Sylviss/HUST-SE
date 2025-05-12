// ./frontend/src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// We will create an apiClient soon
// import apiClient from '../../services/apiClient';
import apiClient from '../../services/apiClient'; // IMPORT REAL API CLIENT


// Placeholder for API calls - replace with actual apiClient later
// const mockApiClient = {
//   login: async (credentials) => {
//     // Simulate API call
//     return new Promise((resolve, reject) => {
//       setTimeout(() => {
//         if (credentials.username === 'admin' && credentials.password === 'password') { // Mock successful login
//           resolve({
//             token: 'mock-jwt-token',
//             staff: { id: '1', name: 'Admin User', username: 'admin', role: 'MANAGER' },
//           });
//         } else {
//           reject({ message: 'Invalid mock credentials' });
//         }
//       }, 1000);
//     });
//   },
//   // We'll add register if needed, logout is mostly local state clearing + API call
// };


// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials); // USE REAL API CLIENT
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('staffInfo', JSON.stringify(response.data.staff));
      return response.data; // Return the data part of the response
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  staff: JSON.parse(localStorage.getItem('staffInfo')) || null,
  token: localStorage.getItem('authToken') || null,
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('authToken'), // Check if token exists initially
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('staffInfo');
      state.staff = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.staff = action.payload.staff;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.staff = null;
        state.token = null;
        state.error = action.payload; // Error message from rejectWithValue
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;