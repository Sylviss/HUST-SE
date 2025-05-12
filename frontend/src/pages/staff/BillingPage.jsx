// ./frontend/src/pages/staff/BillingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  generateOrFetchBillForSession,
  confirmPayment,
  clearBillError,
  clearPaymentError,
  clearCurrentBill
} from '../../store/slices/billSlice';
import { fetchDiningSessionById } from '../../store/slices/diningSessionSlice'; // To display session info
import { BillStatus, DiningSessionStatus,OrderItemStatus } from '../../utils/constants';

function BillingPage() {
  const { sessionId } = useParams(); // Get sessionId from URL
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { staff } = useSelector((state) => state.auth);
  const { currentBill, isLoading, error, isProcessingPayment, paymentError } = useSelector((state) => state.bills);
  const { currentSession, isLoadingCurrent: sessionLoading } = useSelector(state => state.diningSessions);

  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Default payment method

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchDiningSessionById(sessionId)); // Fetch session details
      dispatch(generateOrFetchBillForSession(sessionId));
    }
    return () => {
      dispatch(clearBillError());
      dispatch(clearPaymentError());
      dispatch(clearCurrentBill());
    };
  }, [dispatch, sessionId]);

  const handleConfirmPayment = () => {
    if (currentBill && currentBill.id) {
      if(currentBill.status === BillStatus.PAID) {
        alert("This bill is already paid.");
        return;
      }
      dispatch(confirmPayment({ billId: currentBill.id, paymentDetails: { paymentMethod } }));
    }
  };

  if (sessionLoading || (isLoading && !currentBill) ) { // Show loading if session or initial bill is loading
    return <p className="text-center text-lg">Loading bill details...</p>;
  }
  if (error) {
    return <p className="text-center text-lg text-red-500">Error loading bill: {error}</p>;
  }
  if (!currentSession && !isLoading) { // No session found after loading
      return <p className="text-center text-lg text-red-500">Dining session not found for ID: {sessionId}</p>
  }


  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Process Bill</h1>
      {currentSession && (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <h2 className="text-xl font-semibold">Session Details</h2>
            <p>Table: {currentSession.table?.tableNumber || 'N/A'}</p>
            <p>Opened: {new Date(currentSession.startTime).toLocaleString()}</p>
            <p>Party: {currentSession.partyIdentifier || `${currentSession.partySize} guests`}</p>
            <p>Status: {currentSession.status}</p>
        </div>
      )}

      {isLoading && !currentBill && <p>Generating/Fetching bill...</p>}

      {currentBill ? (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">Bill ID: ...{currentBill.id.slice(-6)}</h2>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              currentBill.status === BillStatus.PAID ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' :
              currentBill.status === BillStatus.UNPAID ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
              'bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100' // For VOID
            }`}>
              {currentBill.status}
            </span>
          </div>

          <div className="border-b dark:border-gray-700 pb-4 mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Items:</h3>
            {currentBill.diningSession?.orders?.flatMap(order => order.items).map((item, index) => (
                (item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY) && // Only show served/ready items on bill
                <div key={item.id || index} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                    <span className="text-gray-800 dark:text-gray-200">${(item.priceAtOrderTime * item.quantity).toFixed(2)}</span>
                </div>
            ))}
             {(!currentBill.diningSession?.orders || currentBill.diningSession.orders.flatMap(order => order.items).filter(item => item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY).length === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No billable items found.</p>
            )}
          </div>

          <div className="space-y-2 text-right mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal: <span className="font-semibold">${currentBill.subtotalAmount?.toFixed(2)}</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tax: <span className="font-semibold">${currentBill.taxAmount?.toFixed(2)}</span></p>
            {currentBill.discountAmount > 0 &&
              <p className="text-sm text-gray-600 dark:text-gray-400">Discount: <span className="font-semibold">-${currentBill.discountAmount?.toFixed(2)}</span></p>
            }
            <p className="text-xl font-bold text-gray-800 dark:text-white">Total: <span className="text-green-600 dark:text-green-400">${currentBill.totalAmount?.toFixed(2)}</span></p>
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
              {paymentError && <p className="text-red-500 text-sm">{paymentError}</p>}
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
            <p className="text-center text-green-600 dark:text-green-400 font-semibold">Payment Confirmed on {new Date(currentBill.paymentConfirmationTime).toLocaleString()}</p>
          )}
        </div>
      ) : (
        !isLoading && <p className="text-center text-lg text-gray-500 dark:text-gray-400">No bill generated for this session yet, or session not found.</p>
      )}
    </div>
  );
}

export default BillingPage;