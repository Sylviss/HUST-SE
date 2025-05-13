// ./frontend/src/pages/DashboardPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { fetchTables, clearTableError } from '../store/slices/tableSlice';
import {
  fetchReadyToServeOrders_Dashboard,
  fetchActionRequiredOrders_Dashboard,
  clearReadyError_Dashboard,
  clearActionRequiredError_Dashboard
} from '../store/slices/orderSlice'; // Import new thunks
import { StaffRole, OrderStatus  } from '../utils/constants'; 

function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // For navigating to order resolution
  const { staff } = useSelector((state) => state.auth);
  const { items: tables, isLoading, error } = useSelector((state) => state.tables);

  const {
    readyToServeOrders_Dashboard,
    actionRequiredOrders_Dashboard,
    isLoadingReady_Dashboard,
    isLoadingActionRequired_Dashboard,
    readyError_Dashboard,
    actionRequiredError_Dashboard
  } = useSelector((state) => state.orders);

  const canViewTables = staff?.role === StaffRole.MANAGER ||
                        staff?.role === StaffRole.WAITER ||
                        staff?.role === StaffRole.CASHIER;

  const isWaiterOrManager = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER;

  useEffect(() => {
    if (canViewTables) {
      dispatch(fetchTables());
    }
    if (isWaiterOrManager) { // Only Waiters/Managers need these dashboard notifications
        dispatch(fetchReadyToServeOrders_Dashboard());
        dispatch(fetchActionRequiredOrders_Dashboard());
    }
    
    return () => {
        if (canViewTables) dispatch(clearTableError());
        if (isWaiterOrManager) {
            dispatch(clearReadyError_Dashboard());
            dispatch(clearActionRequiredError_Dashboard());
        }
    }
  }, [dispatch, canViewTables, isWaiterOrManager]); // Add isWaiterOrManager


  if (!staff) {
    return <p>Loading user information...</p>; // Or redirect if not authenticated
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        Welcome to the Staff Dashboard, {staff.name}!
      </h1>
      <p className="mb-4 text-lg text-gray-700 dark:text-gray-300">Your role: {staff.role}</p>
      {/* Conditionally render the Restaurant Tables section */}
      {canViewTables && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Restaurant Tables</h2>
          {isLoading && <p className="text-blue-500">Loading tables...</p>}
          {error && <p className="text-red-500">Error fetching tables: {error}</p>}
          {!isLoading && !error && tables.length === 0 && (
            <p className="text-gray-600 dark:text-gray-400">No tables found. Managers can add tables via the admin section.</p>
          )}
          {!isLoading && !error && tables.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6"
                >
                  <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    Table: {table.tableNumber}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">Capacity: {table.capacity}</p>
                  <p className={`font-semibold ${
                      table.status === 'AVAILABLE' ? 'text-green-500' :
                      table.status === 'OCCUPIED' ? 'text-red-500' :
                      table.status === 'RESERVED' ? 'text-yellow-500' :
                      'text-gray-500'
                    }`}
                  >
                    Status: {table.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Notifications Section - Only for Waiter/Manager */}
      {isWaiterOrManager && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Notifications & Quick Actions</h2> {/* NEW HEADER */}
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200"></h2>
          <div className="p-4 bg-teal-50 dark:bg-teal-900 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-teal-700 dark:text-teal-300 mb-3">Ready for Serving ({readyToServeOrders_Dashboard.length})</h2>
            {isLoadingReady_Dashboard && <p className="text-sm">Loading...</p>}
            {readyError_Dashboard && <p className="text-sm text-red-500">{readyError_Dashboard}</p>}
            {!isLoadingReady_Dashboard && readyToServeOrders_Dashboard.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No orders currently ready.</p>}
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {readyToServeOrders_Dashboard.map(order => (
                <li key={order.id} className="text-sm p-2 bg-teal-100 dark:bg-teal-800 rounded">
                  Order <Link to={`/staff/sessions/${order.diningSession.id}/orders/new`} className="font-semibold text-indigo-600 hover:underline">...{order.id.slice(-6)}</Link> for Table <span className="font-semibold">{order.diningSession?.table?.tableNumber || 'N/A'}</span> is READY.
                  <Link to="/staff/serving-queue" className="ml-2 text-xs px-2 py-0.5 bg-purple-500 text-white rounded hover:bg-purple-600">
                    Go to Serving
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Orders Requiring Action */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-orange-700 dark:text-orange-300 mb-3">Orders Requiring Action ({actionRequiredOrders_Dashboard.length})</h2>
            {isLoadingActionRequired_Dashboard && <p className="text-sm">Loading...</p>}
            {actionRequiredError_Dashboard && <p className="text-sm text-red-500">{actionRequiredError_Dashboard}</p>}
            {!isLoadingActionRequired_Dashboard && actionRequiredOrders_Dashboard.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No orders currently require action.</p>}
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {actionRequiredOrders_Dashboard.map(order => (
                <li key={order.id} className="text-sm p-2 bg-orange-100 dark:bg-orange-800 rounded">
                  Order <Link to={`/staff/sessions/${order.diningSession.id}/orders/${order.id}/resolve`} state={{ orderToResolve: order }} className="font-semibold text-indigo-600 hover:underline">...{order.id.slice(-6)}</Link> for Table <span className="font-semibold">{order.diningSession?.table?.tableNumber || 'N/A'}</span> requires attention.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* End of conditionally rendered tables section */}
    </div>
  );
}

export default DashboardPage;