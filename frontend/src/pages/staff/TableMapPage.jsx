// ./frontend/src/pages/staff/TableMapPage.jsx
import React, { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTables, clearTableError } from '../../store/slices/tableSlice';
import { fetchReservations, clearReservationError } from '../../store/slices/reservationSlice';
import {
  startDiningSession,
  clearSessionSubmitError, // Corrected this import based on your previous fix
} from '../../store/slices/diningSessionSlice';
import { StaffRole, TableStatusEnum, ReservationStatusEnum } from '../../utils/constants';

// Simple Modal Placeholder (as you provided)
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
  const { isSubmitting: isSessionSubmitting, submitError: sessionSubmitError } = useSelector(state => state.diningSessions || {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [partySize, setPartySize] = useState(2);
  const [partyIdentifier, setPartyIdentifier] = useState('');
  const [selectedReservationId, setSelectedReservationId] = useState('');

  const todayISO = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(fetchReservations({ status: ReservationStatusEnum.CONFIRMED, date: todayISO }));
    
    return () => {
        dispatch(clearTableError());
        dispatch(clearReservationError());
        dispatch(clearSessionSubmitError());
    }
  }, [dispatch, todayISO]); // todayISO won't change in component lifecycle, but good to have if date filter was dynamic

  const handleTableSelect = (table) => {
    // Allow selection only if table is not already fully occupied or out of service
    if (table.status === TableStatusEnum.OCCUPIED || table.status === TableStatusEnum.OUT_OF_SERVICE) {
      alert(`Table ${table.tableNumber} is currently ${table.status}. Cannot start a new session.`);
      return;
    }

    setSelectedTable(table);
    setPartyIdentifier(''); // Reset for walk-in by default

    // Logic to pre-select reservation if table is RESERVED
    if (table.status === TableStatusEnum.RESERVED) {
      const matchingReservation = reservations.find(
        (res) => res.tableId === table.id && res.status === ReservationStatusEnum.CONFIRMED
      );
      if (matchingReservation) {
        setSelectedReservationId(matchingReservation.id);
        setPartySize(matchingReservation.partySize);
      } else {
        // Table is RESERVED but no matching CONFIRMED reservation found for it (data inconsistency or old reservation)
        // Or it's reserved for a reservation not yet loaded (e.g. different date filter initially)
        // For now, allow staff to override, backend will validate.
        // Could display a warning here.
        setSelectedReservationId('');
        setPartySize(table.capacity); // Default to table capacity
        alert(`Table ${table.tableNumber} is marked RESERVED, but no matching active confirmed reservation found. Proceed with caution or verify reservation details.`);
      }
    } else { // Table is AVAILABLE or NEEDS_CLEANING (still seatable)
      setSelectedReservationId(''); // Clear any previously selected reservation
      setPartySize(Math.min(2, table.capacity)); // Default party size for available table
    }
    setIsModalOpen(true);
  };

  const handleStartSession = async () => {
    if (!selectedTable) return;
    if (!partySize || partySize <= 0) {
        alert("Party size must be greater than 0.");
        return;
    }
    if (partySize > selectedTable.capacity) {
        alert(`Party size (${partySize}) exceeds table capacity (${selectedTable.capacity}).`);
        return;
    }

    const sessionData = {
      tableId: selectedTable.id,
      partySize: parseInt(partySize, 10),
      partyIdentifier: selectedReservationId ? undefined : (partyIdentifier.trim() || `Walk-in Party of ${partySize}`),
      reservationId: selectedReservationId || null,
    };

    const resultAction = await dispatch(startDiningSession({sessionData})); // staffId is handled by backend via token
    if (startDiningSession.fulfilled.match(resultAction)) {
      const newSession = resultAction.payload;
      setIsModalOpen(false);
      setSelectedTable(null);
      setSelectedReservationId('');
      setPartyIdentifier('');
      dispatch(fetchTables()); // Re-fetch tables to update status
      if(sessionData.reservationId) dispatch(fetchReservations({ status: ReservationStatusEnum.CONFIRMED, date: todayISO }));
      
      alert(`Dining session started for table ${selectedTable.tableNumber}!`);
      navigate(`/staff/sessions/${newSession.id}/orders/new`);
    }
    // Errors are handled by sessionSubmitError displayed in modal or via alert
     if (startDiningSession.rejected.match(resultAction)) {
        alert(`Failed to start session: ${resultAction.payload || 'Unknown error'}`);
    }
  };

  // Filter reservations for the dropdown based on the selected table's status
  const reservationsForDropdown = useMemo(() => {
    if (!selectedTable || reservationsLoading || reservationsError) return [];

    if (selectedTable.status === TableStatusEnum.RESERVED) {
      // If table is reserved, ideally only show the reservation specifically for this table.
      // Backend will enforce this, but UI can guide.
      return reservations.filter(
        r => r.status === ReservationStatusEnum.CONFIRMED && r.tableId === selectedTable.id
      );
    } else if (selectedTable.status === TableStatusEnum.AVAILABLE) {
      // If table is available, show confirmed reservations that DO NOT have a table assigned yet,
      // or allow selecting any confirmed reservation (backend will validate if that reservation's pre-assigned table matches).
      // For a simpler UI, let's show confirmed reservations that don't yet have an *active* session.
      return reservations.filter(
        r => r.status === ReservationStatusEnum.CONFIRMED &&
             (!r.diningSession || r.diningSession?.status !== DiningSessionStatus.ACTIVE) && // Not already seated
             (!r.tableId || r.tableId === selectedTable.id) // Either unassigned OR assigned to this specific available table
      );
    }
    return []; // No reservations to link if table is not in a seatable state for new sessions this way
  }, [selectedTable, reservations, reservationsLoading, reservationsError]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Table Seating Management</h1>

      {tablesLoading && <p>Loading tables...</p>}
      {tablesError && <p className="text-red-500">Error fetching tables: {tablesError}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
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
              <label htmlFor="reservationSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Reservation (Optional):</label>
              <select
                id="reservationSelect"
                value={selectedReservationId}
                onChange={(e) => {
                    const resId = e.target.value;
                    setSelectedReservationId(resId);
                    const res = reservations.find(r => r.id === resId); // Use full reservations list
                    if (res) {
                        setPartySize(res.partySize);
                        setPartyIdentifier(res.customer?.name || `Reservation ${res.id.slice(-4)}`);
                    } else {
                        // Reset if "Walk-in" is selected or no reservation
                        setPartySize(Math.min(2, selectedTable.capacity));
                        setPartyIdentifier('');
                    }
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">-- Walk-in --</option>
                {reservationsLoading && <option disabled>Loading reservations...</option>}
                {/* Use filtered reservationsForDropdown here if you prefer stricter UI guidance */}
                {/* Or show all confirmed and let backend validate */}
                {reservations.filter(r => r.status === ReservationStatusEnum.CONFIRMED).map(res => (
                  <option key={res.id} value={res.id}>
                    {res.customer?.name || 'N/A'} - {res.partySize} ppl @ {new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {res.tableId && ` (for T${res.table?.tableNumber || res.tableId.slice(-4)})`}
                  </option>
                ))}
              </select>
               {reservationsError && <p className="text-red-500 text-xs mt-1">Error loading reservations: {reservationsError}</p>}
            </div>

            <div>
              <label htmlFor="partySizeInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Party Size:</label>
              <input
                id="partySizeInput"
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value,10))}
                min="1"
                max={selectedTable.capacity} // Dynamic max based on selected table
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
              {partySize > selectedTable.capacity && <p className="text-red-500 text-xs mt-1">Party exceeds table capacity of {selectedTable.capacity}.</p>}
            </div>

            {!selectedReservationId && (
                <div>
                <label htmlFor="partyIdentifierInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Party Identifier (e.g., Name for Walk-in):</label>
                <input
                    id="partyIdentifierInput"
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
              disabled={isSessionSubmitting || !partySize || partySize <= 0 || partySize > selectedTable.capacity }
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