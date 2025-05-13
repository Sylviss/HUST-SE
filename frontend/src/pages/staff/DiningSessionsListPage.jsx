// ./frontend/src/pages/staff/DiningSessionsListPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAllDiningSessions, clearSessionListError } from '../../store/slices/diningSessionSlice';
import { DiningSessionStatus, StaffRole } from '../../utils/constants';

function DiningSessionsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    list: diningSessions,
    isLoadingList,
    listError
  } = useSelector((state) => state.diningSessions);
  const { staff } = useSelector((state) => state.auth);

  const [filterStatus, setFilterStatus] = useState(''); // Default to all
  const [filterDate, setFilterDate] = useState(''); // Optional date filter

  useEffect(() => {
    const filters = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterDate) filters.date = filterDate;
    dispatch(fetchAllDiningSessions(filters));
    return () => {
        dispatch(clearSessionListError());
    }
  }, [dispatch, filterStatus, filterDate]);

  // Roles that can view this page
  const canViewPage = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.CASHIER || staff?.role === StaffRole.WAITER;

  if (!canViewPage && staff) { // Redirect if role is not permitted but user is staff
      navigate(staff?.role === StaffRole.KITCHEN_STAFF ? '/staff/kitchen' : '/'); // Example redirect
      return <p className="p-4">Access Denied. Redirecting...</p>;
  }


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">All Dining Sessions</h1>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md shadow flex flex-col sm:flex-row gap-4 items-end">
        <div>
            <label htmlFor="filterSessionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date:</label>
            <input
                type="date"
                id="filterSessionDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-600 dark:text-white"
            />
        </div>
        <div>
            <label htmlFor="filterSessionStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
            <select
                id="filterSessionStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:text-white"
            >
                <option value="">All Statuses</option>
                {Object.values(DiningSessionStatus).map(status => (
                <option key={status} value={status}>{status}</option>
                ))}
            </select>
        </div>
      </div>


      {isLoadingList && <p className="text-blue-500">Loading dining sessions...</p>}
      {listError && <p className="text-red-500">Error fetching sessions: {listError}</p>}

      {!isLoadingList && !listError && diningSessions.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No dining sessions found for the selected criteria.</p>
      )}

      {!isLoadingList && !listError && diningSessions.length > 0 && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Table</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Party</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Opened By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {diningSessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{session.table?.tableNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{session.partyIdentifier || `${session.partySize} guests`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(session.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{session.endTime ? new Date(session.endTime).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      session.status === DiningSessionStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                      session.status === DiningSessionStatus.BILLED ? 'bg-yellow-100 text-yellow-800' :
                      session.status === DiningSessionStatus.CLOSED ? 'bg-gray-100 text-gray-800' : ''
                    }`}>{session.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{session.openedBy?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/staff/sessions/${session.id}/details`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                      View Details
                    </Link>
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

export default DiningSessionsListPage;