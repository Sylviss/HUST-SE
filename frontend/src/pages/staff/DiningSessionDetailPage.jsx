// ./frontend/src/pages/staff/DiningSessionDetailPage.jsx
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDiningSessionById, clearSessionCurrentError, clearCurrentSession } from '../../store/slices/diningSessionSlice';
import { OrderStatus, OrderItemStatus, BillStatus, DiningSessionStatus } from '../../utils/constants';

function DiningSessionDetailPage() {
  const { sessionId } = useParams();
  const dispatch = useDispatch();
  const {
    currentSession,
    isLoadingCurrent,
    currentError
  } = useSelector((state) => state.diningSessions);

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchDiningSessionById(sessionId));
    }
    return () => {
      dispatch(clearCurrentSession()); // Clear when leaving the page
      dispatch(clearSessionCurrentError());
    };
  }, [dispatch, sessionId]);

  if (isLoadingCurrent) return <p className="p-4 text-blue-500">Loading session details...</p>;
  if (currentError) return <p className="p-4 text-red-500">Error loading session: {currentError}</p>;
  if (!currentSession) return <p className="p-4">Dining session not found.</p>;

  const calculateOrderTotal = (order) => {
    return order.items?.reduce((sum, item) => {
        if(item.status !== OrderItemStatus.CANCELLED && item.status !== OrderItemStatus.SOLD_OUT) {
            return sum + (parseFloat(item.priceAtOrderTime) * item.quantity);
        }
        return sum;
    }, 0).toFixed(2) || '0.00';
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link to="/staff/active-sessions" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200">
          ← Back to All Sessions
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">Dining Session Details</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ID: {currentSession.id}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">Session Info</h2>
          <p><strong>Table:</strong> {currentSession.table?.tableNumber || 'N/A'}</p>
          <p><strong>Party:</strong> {currentSession.partyIdentifier || `${currentSession.partySize} guests`}</p>
          <p><strong>Opened By:</strong> {currentSession.openedBy?.name || 'N/A'}</p>
          <p><strong>Start Time:</strong> {new Date(currentSession.startTime).toLocaleString()}</p>
          <p><strong>End Time:</strong> {currentSession.endTime ? new Date(currentSession.endTime).toLocaleString() : 'Active'}</p>
          <p><strong>Status:</strong> <span className="font-semibold">{currentSession.status}</span></p>
          {currentSession.reservation && (
            <p><strong>Reservation:</strong> Customer <span className="font-semibold">{currentSession.reservation.customer?.name}</span> (...{currentSession.reservation.id.slice(-6)})</p>
          )}
        </div>

        {/* Bill Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">Bill Details</h2>
          {currentSession.bill ? (
            <>
              <p><strong>Bill ID:</strong> ...{currentSession.bill.id.slice(-6)}</p>
              <p><strong>Total Amount:</strong> <span className="font-bold text-green-600 dark:text-green-400">${parseFloat(currentSession.bill.totalAmount || 0).toFixed(2)}</span></p>
              <p><strong>Status:</strong> <span className="font-semibold">{currentSession.bill.status}</span></p>
              {currentSession.bill.status === BillStatus.PAID && currentSession.bill.paymentConfirmationTime && (
                 <p><strong>Paid At:</strong> {new Date(currentSession.bill.paymentConfirmationTime).toLocaleString()}</p>
              )}
              {currentSession.bill.status === BillStatus.UNPAID && currentSession.status !== DiningSessionStatus.CLOSED && (
                  <Link to={`/staff/sessions/${sessionId}/bill`} className="mt-3 inline-block px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-md">
                      Go to Process Bill
                  </Link>
              )}
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No bill generated yet for this session.</p>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Orders in this Session</h2>
        {currentSession.orders && currentSession.orders.length > 0 ? (
          <div className="space-y-4">
            {currentSession.orders.map(order => (
              <div key={order.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-700 dark:text-gray-200">Order ID: ...{order.id.slice(-6)} (Taken by: {order.takenBy?.name || 'N/A'})</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{order.status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time: {new Date(order.orderTime).toLocaleTimeString()}</p>
                <ul className="list-disc list-inside ml-4 text-sm">
                  {order.items?.map(item => (
                    <li key={item.id} className="text-gray-600 dark:text-gray-300">
                      {item.quantity}x {item.menuItem?.name || 'Unknown Item'} - ${(parseFloat(item.priceAtOrderTime) * item.quantity).toFixed(2)}
                      {item.status === OrderItemStatus.SOLD_OUT && <span className="ml-2 text-xs text-red-500">(SOLD OUT)</span>}
                      {item.status === OrderItemStatus.CANCELLED && <span className="ml-2 text-xs text-gray-500 line-through">(CANCELLED)</span>}
                      {item.specialRequests && <p className="text-xs italic text-gray-500 dark:text-gray-400 ml-4">Note: {item.specialRequests}</p>}
                    </li>
                  ))}
                </ul>
                 {order.notes && <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">Order Notes: {order.notes}</p>}
                 <p className="text-right font-semibold text-sm mt-1">Order Total: ${calculateOrderTotal(order)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No orders placed for this session yet.</p>
        )}
         {currentSession.status === DiningSessionStatus.ACTIVE && (
             <div className="mt-6">
                <Link to={`/staff/sessions/${sessionId}/orders/new`} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
                    Add New Order to this Session
                </Link>
             </div>
         )}
      </div>
    </div>
  );
}

export default DiningSessionDetailPage;