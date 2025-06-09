// ./frontend/src/pages/staff/BillingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Added Link
import { useSelector, useDispatch } from 'react-redux';
import {
  generateOrFetchBillForSession,
  confirmPayment,
  clearBillError,
  clearPaymentError,
  clearCurrentBill
} from '../../store/slices/billSlice';
import { fetchDiningSessionById, clearSessionCurrentError, clearCurrentSession } from '../../store/slices/diningSessionSlice'; // To display session info
import { BillStatus, DiningSessionStatus, OrderItemStatus, OrderStatus } from '../../utils/constants'; // Added OrderStatus

function BillingPage() {
  const { sessionId } = useParams(); // Get sessionId from URL
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { staff } = useSelector((state) => state.auth);
  const { currentBill, isLoading, error: billFetchGenerateError, isProcessingPayment, paymentError } = useSelector((state) => state.bills);
  const { currentSession, isLoadingCurrent: sessionDetailsLoading, currentError: sessionDetailsError } = useSelector(state => state.diningSessions);

  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Default payment method

  useEffect(() => {
    if (sessionId) {
      // Clear previous errors before new attempt
      dispatch(clearBillError());
      dispatch(clearPaymentError());
      dispatch(clearSessionCurrentError()); // Clear session error too

      dispatch(fetchDiningSessionById(sessionId)); // Fetch session details
      dispatch(generateOrFetchBillForSession(sessionId));
    }
    return () => {
      // Cleanup on unmount
      dispatch(clearBillError());
      dispatch(clearPaymentError());
      dispatch(clearCurrentBill());
      dispatch(clearSessionCurrentError());
      dispatch(clearCurrentSession());
    };
  }, [dispatch, sessionId]);

  const handleConfirmPayment = () => {
    if (currentBill && currentBill.id) {
      if(currentBill.status === BillStatus.PAID) {
        alert("This bill is already paid.");
        return;
      }
      dispatch(confirmPayment({ billId: currentBill.id, paymentDetails: { paymentMethod } }))
        .then((resultAction) => {
            if(confirmPayment.fulfilled.match(resultAction)){
                // Optionally, navigate away or show a persistent success message
                // For now, the bill UI will update to show "PAID"
                alert("Payment confirmed successfully!");
            }
        });
    }
  };

  // --- Loading and Initial Error States ---
  if (sessionDetailsLoading || (isLoading && !currentBill && !billFetchGenerateError) ) {
    return <p className="text-center text-lg p-8 text-blue-500 dark:text-blue-300">Loading bill and session details...</p>;
  }

  if (sessionDetailsError) {
    return (
        <div className="container mx-auto p-4 text-center">
            <p className="text-red-500 text-lg mb-4">Error loading session details: {sessionDetailsError}</p>
            <button
              onClick={() => {
                dispatch(clearSessionCurrentError());
                dispatch(fetchDiningSessionById(sessionId));
              }}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry Loading Session
            </button>
        </div>
    );
  }

  if (!currentSession && !sessionDetailsLoading) { // After loading, if no session
      return (
        <div className="container mx-auto p-4 text-center">
            <p className="text-center text-lg text-red-500 p-8">Dining session (ID: {sessionId ? `...${sessionId.slice(-6)}` : 'Unknown'}) not found.</p>
            <Link to="/staff/active-sessions" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                Back to Active Sessions
            </Link>
        </div>
      );
  }


  // --- Bill Specific Error Handling and Display ---
  let billDisplayContent;

  if (billFetchGenerateError) {
    billDisplayContent = (
      <div className="mt-6 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative shadow-md" role="alert">
        <strong className="font-bold">Error Generating / Fetching Bill:</strong>
        <span className="block sm:inline ml-2">{billFetchGenerateError}</span>
        {billFetchGenerateError.startsWith('Cannot generate bill. The following orders are not yet SERVED or CANCELLED:') && (
          <p className="text-sm mt-2">
            Please ensure all items in all orders for this session are either SERVED or CANCELLED.
            <Link to={`/staff/sessions/${sessionId}/orders/new`} className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Go to Orders for this Session to Finalize
            </Link>
          </p>
        )}
        <button
          onClick={() => {
            dispatch(clearBillError()); // Clear error before retrying
            dispatch(generateOrFetchBillForSession(sessionId));
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
            Retry Bill Generation
        </button>
      </div>
    );
  } else if (isLoading && !currentBill) { // Bill is actively being fetched/generated for the first time
    billDisplayContent = <p className="text-center text-lg p-6 text-blue-500 dark:text-blue-300">Generating / Fetching bill...</p>;
  } else if (currentBill) {
    billDisplayContent = (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">Bill ID: ...{currentBill.id.slice(-6)}</h2>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              currentBill.status === BillStatus.PAID ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
              currentBill.status === BillStatus.UNPAID ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
              'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' // For VOID
            }`}>
              {currentBill.status}
            </span>
          </div>

          <div className="border-b dark:border-gray-700 pb-4 mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Billable Items:</h3>
            {/* Ensure currentBill.diningSession and its orders/items are properly included by the backend API */}
            {currentBill.diningSession?.orders?.flatMap(order => order.items || []).filter(item =>
                item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY // Only served/ready items count
            ).map((item, index) => (
                <div key={item.id || `bill-item-${index}`} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.quantity}x {item.menuItem?.name || 'Item Name Missing'}</span>
                    <span className="text-gray-800 dark:text-gray-200">đ{(parseFloat(item.priceAtOrderTime) * item.quantity).toFixed(0)}</span>
                </div>
            ))}
            {(!currentBill.diningSession?.orders ||
             currentBill.diningSession.orders.flatMap(order => order.items || []).filter(item =>
                item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY
             ).length === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No billable items found for this session.</p>
            )}
          </div>

          <div className="space-y-2 text-right mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal: <span className="font-semibold">đ{parseFloat(currentBill.subtotalAmount || 0).toFixed(0)}</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tax: <span className="font-semibold">đ{parseFloat(currentBill.taxAmount || 0).toFixed(0)}</span></p>
            {currentBill.discountAmount > 0 &&
              <p className="text-sm text-gray-600 dark:text-gray-400">Discount: <span className="font-semibold">-đ{parseFloat(currentBill.discountAmount).toFixed(0)}</span></p>
            }
            <p className="text-xl font-bold text-gray-800 dark:text-white">Total: <span className="text-green-600 dark:text-green-400">đ{parseFloat(currentBill.totalAmount || 0).toFixed(0)}</span></p>
          </div>

          {currentBill.status === BillStatus.UNPAID && (
            <div className="space-y-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method:</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option>Cash</option>
                  <option>Credit Card</option>
                  <option>Mobile Payment</option>
                  <option>Other</option>
                </select>
              </div>
              {paymentError && <p className="text-red-500 text-sm py-2 px-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded">{paymentError}</p>}
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md disabled:opacity-50"
              >
                {isProcessingPayment ? 'Processing Payment...' : 'Confirm Payment Received'}
              </button>
            </div>
          )}
          {currentBill.status === BillStatus.PAID && (
            <p className="text-center text-green-600 dark:text-green-400 font-semibold mt-4">Payment Confirmed on {new Date(currentBill.paymentConfirmationTime).toLocaleString()}</p>
          )}
        </div>
    );
  } else { // No bill generated yet, and no error from trying to generate/fetch.
    billDisplayContent = <p className="text-center text-lg text-gray-500 dark:text-gray-400">No bill has been generated for this session yet.</p>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Process Bill</h1>
        {currentSession && (
            <Link
                to={`/staff/sessions/${sessionId}/orders/new`} // Link to order taking page for this session
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
            >
                View/Add Orders for Session ...{sessionId.slice(-6)}
            </Link>
        )}
      </div>

      {currentSession && ( // Only show session details if currentSession is loaded
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Session Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Table: <span className="font-medium text-gray-800 dark:text-gray-100">{currentSession.table?.tableNumber || 'N/A'}</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Opened: <span className="font-medium text-gray-800 dark:text-gray-100">{new Date(currentSession.startTime).toLocaleString()}</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Party: <span className="font-medium text-gray-800 dark:text-gray-100">{currentSession.partyIdentifier || `${currentSession.partySize} guests`}</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Status: <span className="font-medium text-gray-800 dark:text-gray-100">{currentSession.status}</span></p>
        </div>
      )}

      {billDisplayContent}

    </div>
  );
}

export default BillingPage;