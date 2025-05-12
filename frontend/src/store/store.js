// ./frontend/src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice'; // Import
import tableReducer from './slices/tableSlice'; // Import
import menuItemReducer from './slices/menuItemSlice'; // Import


export const store = configureStore({
  reducer: {
    auth: authReducer, // Add reducer
    tables: tableReducer, // Add table reducer
    menuItems: menuItemReducer, // Add
  },
});