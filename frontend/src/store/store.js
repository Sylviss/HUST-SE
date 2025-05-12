// ./frontend/src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice'; // Import

export const store = configureStore({
  reducer: {
    auth: authReducer, // Add reducer
  },
});