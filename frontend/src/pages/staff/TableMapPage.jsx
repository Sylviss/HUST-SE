// ./frontend/src/pages/staff/TableMapPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTables, clearTableError } from '../../store/slices/tableSlice';
import { fetchReservations, clearReservationError } from '../../store/slices/reservationSlice'; // To select a reservation
import {
  startDiningSession,
  clearSessionSubmitError, // CHANGE THIS
} from '../../store/slices/diningSessionSlice';
import { StaffRole, TableStatusEnum, ReservationStatusEnum } from '../../utils/constants';
// Modal component will be created or use a library

// Simple Modal Placeholder (you'd use a proper modal component library or build one)
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3>
          <div className="mt-2 px-7 py-3">
            {children}
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


function TableMapPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { staff } = useSelector((state) => state.auth);
  const { items: tables, isLoading: tablesLoading, error: tablesError } = useSelector((state) => state.tables);
  const { items: reservations, isLoading: reservationsLoading, error: reservationsError } = useSelector(
    (state) => state.reservations
  );
  // diningSessionSlice state will be needed for isSubmitting and submitError
  const { isSubmitting: isSessionSubmitting, submitError: sessionSubmitError } = useSelector(state => state.diningSessions || {});


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [partySize, setPartySize] = useState(2); // Default party size for walk-in
  const [partyIdentifier, setPartyIdentifier] = useState(''); // For walk-in name/notes
  const [selectedReservationId, setSelectedReservationId] = useState('');

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(fetchReservations({ status: ReservationStatusEnum.CONFIRMED, date: new Date().toISOString().split('T')[0] }));
    
    return () => {
        dispatch(clearTableError());
        dispatch(clearReservationError());
        dispatch(clearSessionSubmitError()); // USE THE CORRECT ACTION
    }
  }, [dispatch]);

  const handleTableSelect = (table) => {
    if (table.status === TableStatusEnum.AVAILABLE || table.status === TableStatusEnum.RESERVED) {
      setSelectedTable(table);
      setPartySize(table.capacity); // Default to table capacity or a sensible default
      setIsModalOpen(true);
    } else {
      alert(`Table ${table.tableNumber} is currently ${table.status}.`);
    }
  };

  const handleStartSession = async () => {
    if (!selectedTable) return;

    const sessionData = {
      tableId: selectedTable.id,
      partySize: parseInt(partySize, 10),
      partyIdentifier: selectedReservationId ? undefined : partyIdentifier, // Only for walk-ins
      reservationId: selectedReservationId || null,
    };

    const resultAction = await dispatch(startDiningSession({sessionData, staffId: staff.id}));
    if (startDiningSession.fulfilled.match(resultAction)) {
      const newSession = resultAction.payload;
      setIsModalOpen(false);
      setSelectedTable(null);
      setSelectedReservationId('');
      setPartyIdentifier('');
      dispatch(fetchTables()); // Re-fetch tables to update status
      if(selectedReservationId) dispatch(fetchReservations({ status: ReservationStatusEnum.CONFIRMED, date: new Date().toISOString().split('T')[0] })); // Re-fetch reservations
      // Potentially navigate to the new dining session's order page
      // navigate(`/staff/sessions/${newSession.id}/orders`);
      alert(`Dining session started for table ${selectedTable.tableNumber}!`);
      navigate(`/staff/sessions/${newSession.id}/orders/new`);
    }
    // Errors will be handled by sessionSubmitError displayed in modal
  };

  const confirmedReservationsForToday = reservations.filter(
    r => r.status === ReservationStatusEnum.CONFIRMED && (!r.diningSession || r.diningSession?.status !== 'ACTIVE')
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Table Seating Management</h1>

      {tablesLoading && <p>Loading tables...</p>}
      {tablesError && <p className="text-red-500">Error fetching tables: {tablesError}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => handleTableSelect(table)}
            disabled={table.status === TableStatusEnum.OCCUPIED || table.status === TableStatusEnum.OUT_OF_SERVICE}
            className={`p-4 border rounded-lg shadow-md text-center font-semibold
                        ${table.status === TableStatusEnum.AVAILABLE ? 'bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-700 text-white' : ''}
                        ${table.status === TableStatusEnum.RESERVED ? 'bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-gray-800' : ''}
                        ${table.status === TableStatusEnum.OCCUPIED ? 'bg-red-500 dark:bg-red-700 text-white cursor-not-allowed' : ''}
                        ${table.status === TableStatusEnum.NEEDS_CLEANING ? 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-white' : ''}
                        ${table.status === TableStatusEnum.OUT_OF_SERVICE ? 'bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-200 cursor-not-allowed' : ''}
                      `}
          >
            <p className="text-lg">Table {table.tableNumber}</p>
            <p className="text-xs">Cap: {table.capacity}</p>
            <p className="text-xs mt-1">{table.status}</p>
          </button>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Seat Party at Table ${selectedTable?.tableNumber}`}>
        {selectedTable && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Reservation (Optional):</label>
              <select
                value={selectedReservationId}
                onChange={(e) => {
                    setSelectedReservationId(e.target.value);
                    const res = confirmedReservationsForToday.find(r => r.id === e.target.value);
                    if (res) setPartySize(res.partySize);
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a Confirmed Reservation (Walk-in if empty)</option>
                {reservationsLoading && <option disabled>Loading reservations...</option>}
                {confirmedReservationsForToday.map(res => (
                  <option key={res.id} value={res.id}>
                    {res.customer.name} - {res.partySize} ppl @ {new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
               {reservationsError && <p className="text-red-500 text-xs mt-1">Error loading reservations: {reservationsError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Party Size:</label>
              <input
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value,10))}
                min="1"
                max={selectedTable.capacity}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            {!selectedReservationId && ( // Only show for walk-ins
                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Party Identifier (e.g., Name for Walk-in):</label>
                <input
                    type="text"
                    value={partyIdentifier}
                    onChange={(e) => setPartyIdentifier(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Walk-in Smith"
                />
                </div>
            )}
            {sessionSubmitError && <p className="text-red-500 text-sm">{sessionSubmitError}</p>}
            <button
              onClick={handleStartSession}
              disabled={isSessionSubmitting || !partySize || partySize > selectedTable.capacity }
              className="mt-4 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50"
            >
              {isSessionSubmitting ? 'Processing...' : 'Start Dining Session'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TableMapPage;