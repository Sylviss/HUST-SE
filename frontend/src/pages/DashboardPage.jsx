// ./frontend/src/pages/DashboardPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTables, clearTableError } from '../store/slices/tableSlice';
import { StaffRole } from '../utils/constants'; 

function DashboardPage() {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const { items: tables, isLoading, error } = useSelector((state) => state.tables);

  const canViewTables = staff?.role === StaffRole.MANAGER ||
                        staff?.role === StaffRole.WAITER ||
                        staff?.role === StaffRole.CASHIER;

  useEffect(() => {
    // Only fetch tables if the current staff role is allowed to view them
    if (canViewTables) {
      dispatch(fetchTables());
    }
    
    return () => {
        if (canViewTables) { // Only clear if tables were potentially fetched
            dispatch(clearTableError());
        }
    }
  }, [dispatch, canViewTables]); // Add canViewTables to dependency array

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
      {/* End of conditionally rendered tables section */}
    </div>
  );
}

export default DashboardPage;