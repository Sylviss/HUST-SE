// ./frontend/src/pages/staff/ReservationsManagementPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchReservations,
  confirmReservation,
  cancelReservation,
  clearReservationError,
  clearReservationActionError
} from '../../store/slices/reservationSlice';
import { fetchTables } from '../../store/slices/tableSlice'; // To select a table for confirmation
import { StaffRole, ReservationStatusEnum, TableStatusEnum } from '../../utils/constants'; // Define ReservationStatusEnum

// Add to ./frontend/src/utils/constants.js
// export const ReservationStatusEnum = {
//   PENDING: 'PENDING',
//   CONFIRMED: 'CONFIRMED',
//   CANCELLED: 'CANCELLED',
//   SEATED: 'SEATED',
//   COMPLETED: 'COMPLETED',
//   NO_SHOW: 'NO_SHOW',
// };

function ReservationsManagementPage() {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const {
    items: reservations,
    isLoading,
    error,
    isProcessingAction,
    actionError
  } = useSelector((state) => state.reservations);
  const { items: tables } = useSelector((state) => state.tables); // Get tables for assignment

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState(ReservationStatusEnum.PENDING);
  const [selectedTableForConfirm, setSelectedTableForConfirm] = useState('');


  useEffect(() => {
    dispatch(fetchReservations({ date: filterDate, status: filterStatus }));
    dispatch(fetchTables({ status: TableStatusEnum.AVAILABLE })); // Fetch available tables for assignment
    return () => {
        dispatch(clearReservationError());
        dispatch(clearReservationActionError());
    }
  }, [dispatch, filterDate, filterStatus]);

  const handleConfirm = (reservationId) => {
    const tableId = selectedTableForConfirm || null; // Use selected table or null
    dispatch(confirmReservation({ reservationId, tableId })).then(() => {
        // Optionally refetch or rely on slice update
         dispatch(fetchReservations({ date: filterDate, status: filterStatus }));
         setSelectedTableForConfirm(''); // Reset selected table
    });
  };

  const handleCancel = (reservationId) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      dispatch(cancelReservation(reservationId)).then(() => {
        // Optionally refetch or rely on slice update
        dispatch(fetchReservations({ date: filterDate, status: filterStatus }));
      });
    }
  };

  const availableTablesForAssignment = tables.filter(t => t.status === TableStatusEnum.AVAILABLE || t.status === TableStatusEnum.RESERVED);


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Manage Reservations</h1>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md shadow flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>
          <input
            type="date"
            id="filterDate"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:text-white"
          >
            {Object.values(ReservationStatusEnum).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
            <option value="">All</option>
          </select>
        </div>
         <div>
          <label htmlFor="assignTable" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign Table (for Confirm):</label>
          <select
            id="assignTable"
            value={selectedTableForConfirm}
            onChange={(e) => setSelectedTableForConfirm(e.target.value)}
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:text-white"
          >
            <option value="">Auto-assign or Keep Unassigned</option>
            {availableTablesForAssignment.map(table => (
                <option key={table.id} value={table.id}>
                    {table.tableNumber} (Cap: {table.capacity})
                </option>
            ))}
          </select>
        </div>
      </div>


      {isLoading && <p className="text-blue-500">Loading reservations...</p>}
      {error && <p className="text-red-500">Error fetching reservations: {error}</p>}
      {actionError && <p className="text-red-500 mt-2">Action Error: {actionError}</p>}

      {!isLoading && !error && reservations.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No reservations found for the selected criteria.</p>
      )}

      {!isLoading && !error && reservations.length > 0 && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Party Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned Table</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reservations.map((res) => (
                <tr key={res.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{res.customer?.name || 'N/A'} ({res.customer?.contactPhone || res.customer?.contactEmail || 'N/A'})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{res.partySize}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{res.table?.tableNumber || 'Not Assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        res.status === ReservationStatusEnum.CONFIRMED ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                        res.status === ReservationStatusEnum.PENDING ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
                        res.status === ReservationStatusEnum.CANCELLED ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' :
                        res.status === ReservationStatusEnum.SEATED ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                    }`}>
                        {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{res.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {res.status === ReservationStatusEnum.PENDING && (
                      <button
                        onClick={() => handleConfirm(res.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        disabled={isProcessingAction}
                      >
                        Confirm
                      </button>
                    )}
                    {(res.status === ReservationStatusEnum.PENDING || res.status === ReservationStatusEnum.CONFIRMED) && (
                      <button
                        onClick={() => handleCancel(res.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        disabled={isProcessingAction}
                      >
                        Cancel
                      </button>
                    )}
                    {/* Add "Seat" button later, which will navigate to/trigger startDiningSession */}
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

export default ReservationsManagementPage;