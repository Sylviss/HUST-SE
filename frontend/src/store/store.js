// ./frontend/src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice'; // Import
import tableReducer from './slices/tableSlice'; // Import
import menuItemReducer from './slices/menuItemSlice'; // Import
import reservationReducer from './slices/reservationSlice'; // 
import diningSessionReducer from './slices/diningSessionSlice'; // Import dining session reducer
import orderReducer from './slices/orderSlice'; // Import order reducer
import billReducer from './slices/billSlice'; // Import
import reportReducer from './slices/reportSlice'; // Import



export const store = configureStore({
  reducer: {
    auth: authReducer, // Add reducer
    tables: tableReducer, // Add table reducer
    menuItems: menuItemReducer, // Add
    reservations: reservationReducer, // Add reservation reducer
    diningSessions: diningSessionReducer, // Add dining session reducer
    orders: orderReducer, // Add order reducer
    bills: billReducer, // Add bill reducer
    reports: reportReducer, // Add
  },
});