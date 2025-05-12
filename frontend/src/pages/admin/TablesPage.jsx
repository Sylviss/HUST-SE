// ./frontend/src/pages/admin/TablesPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTables, deleteTable, updateTableStatus, clearTableError, clearTableSubmitError } from '../../store/slices/tableSlice';
import { StaffRole, TableStatusEnum } from '../../utils/constants'; // Your enums

function TablesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { staff } = useSelector((state) => state.auth);
  const { items: tables, isLoading, error, isSubmitting, submitError } = useSelector((state) => state.tables);

  useEffect(() => {
    dispatch(fetchTables()); // Fetch all tables for manager
    return () => {
        dispatch(clearTableError());
        dispatch(clearTableSubmitError());
    }
  }, [dispatch]);

  const isManager = staff?.role === StaffRole.MANAGER;

  const handleDelete = async (tableId) => {
    if (window.confirm('Are you sure you want to delete this table? This might affect reservations and ongoing sessions.')) {
      dispatch(deleteTable(tableId));
    }
  };

  const handleStatusChange = (tableId, newStatus) => {
    dispatch(updateTableStatus({ tableId, status: newStatus }));
  };

  if (!isManager) { // Should be caught by ProtectedRoute, but good to double check
      navigate('/');
      return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Manage Tables</h1>
        <button
          onClick={() => navigate('/admin/tables/new')}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
          disabled={isSubmitting}
        >
          Add New Table
        </button>
      </div>

      {isLoading && <p className="text-blue-500">Loading tables...</p>}
      {error && <p className="text-red-500">Error fetching tables: {error}</p>}
      {submitError && <p className="text-red-500 mt-2">Operation Error: {submitError}</p>}

      {!isLoading && !error && tables.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No tables found. Add some!</p>
      )}

      {!isLoading && !error && tables.length > 0 && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tables.map((table) => (
                <tr key={table.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{table.tableNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{table.capacity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                        value={table.status}
                        onChange={(e) => handleStatusChange(table.id, e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                    >
                        {Object.values(TableStatusEnum).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => navigate(`/admin/tables/edit/${table.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(table.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TablesPage;