// ./frontend/src/pages/staff/ActiveSessionsPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAllDiningSessions, clearSessionListError } from '../../store/slices/diningSessionSlice';
import { DiningSessionStatus } from '../../utils/constants'; // Make sure this enum is defined

function ActiveSessionsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    list: diningSessions,
    isLoadingList,
    listError
  } = useSelector((state) => state.diningSessions);
  const { staff } = useSelector((state) => state.auth);

  const handleGoToBilling = (sessionId) => {
    navigate(`/staff/sessions/${sessionId}/bill`);
  };

  useEffect(() => {
    // Fetch active and billed sessions. Billed might still need attention or order additions.
    dispatch(fetchAllDiningSessions({ status: `${DiningSessionStatus.ACTIVE},${DiningSessionStatus.BILLED}` }));
    return () => {
        dispatch(clearSessionListError());
    }
  }, [dispatch]);

  const handleViewSessionDetails = (sessionId) => {
    // Navigate to a page that can show session details and allow order taking/editing
    // This could be the existing OrderTakingPage or a dedicated SessionDetailsPage
    navigate(`/staff/sessions/${sessionId}/orders/new`); // Reusing OrderTakingPage for now
  };

  // Define DiningSessionStatus in ./frontend/src/utils/constants.js if not already
  // export const DiningSessionStatus = {
  //   ACTIVE: 'ACTIVE',
  //   BILLED: 'BILLED',
  //   CLOSED: 'CLOSED',
  // };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Active Dining Sessions</h1>

      {isLoadingList && <p className="text-blue-500">Loading active sessions...</p>}
      {listError && <p className="text-red-500">Error fetching sessions: {listError}</p>}

      {!isLoadingList && !listError && diningSessions.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No active or billed dining sessions found.</p>
      )}

      {!isLoadingList && !listError && diningSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {diningSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105"
              // onClick={() => handleViewSessionDetails(session.id)}
            >
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                Table: {session.table?.tableNumber || 'N/A'}
              </h3>
              <div className="mt-4 space-y-2">
                <button
                    onClick={() => navigate(`/staff/sessions/${session.id}/orders/new`)} // Existing order taking
                    className="w-full text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                >
                    View/Add Orders
                </button>
                {(session.status === DiningSessionStatus.ACTIVE || session.status === DiningSessionStatus.BILLED) && (
                    <button
                        onClick={() => handleGoToBilling(session.id)}
                        className="w-full text-sm px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-md"
                    >
                        Process Bill
                    </button>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Session ID: ...{session.id.slice(-6)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Party: {session.partyIdentifier || `${session.partySize} guests`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Opened by: {session.openedBy?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Time: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className={`mt-2 text-xs font-semibold inline-block px-2 py-1 rounded-full ${
                  session.status === DiningSessionStatus.ACTIVE ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' :
                  session.status === DiningSessionStatus.BILLED ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
                  'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                }`}
              >
                Status: {session.status}
              </p>
            </div>
            
          ))}
        </div>
      )}
    </div>
  );
}

export default ActiveSessionsPage;