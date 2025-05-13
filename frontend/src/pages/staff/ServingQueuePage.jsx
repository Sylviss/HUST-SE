// ./frontend/src/pages/staff/ServingQueuePage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchReadyToServeOrders,
  updateOrderStatus,
  clearReadyToServeError,
  clearOrderStatusUpdateError
} from '../../store/slices/orderSlice';
import { StaffRole, OrderStatus, OrderItemStatus } from '../../utils/constants';

function ServingQueuePage() {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const {
    readyToServeOrders,
    isLoadingReadyToServe,
    readyToServeError,
    isUpdatingStatus,
    statusUpdateError
  } = useSelector((state) => state.orders);

  const REFRESH_INTERVAL = 5000; // Refresh every 20 seconds

  useEffect(() => {
    dispatch(fetchReadyToServeOrders());
    const intervalId = setInterval(() => {
      dispatch(fetchReadyToServeOrders());
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
      dispatch(clearReadyToServeError());
      dispatch(clearOrderStatusUpdateError());
    };
  }, [dispatch]);

  const handleMarkServed = (orderId) => {
    dispatch(updateOrderStatus({ orderId, status: OrderStatus.SERVED }));
  };

  // This page should be accessible by Waiters and Managers
  if (staff?.role !== StaffRole.WAITER && staff?.role !== StaffRole.MANAGER) {
    return <p className="text-red-500 p-4">Access Denied. Serving queue is for Waiters and Managers only.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Orders Ready to Serve</h1>

      {isLoadingReadyToServe && readyToServeOrders.length === 0 && <p>Loading ready orders...</p>}
      {readyToServeError && <p className="text-red-500">Error fetching ready orders: {readyToServeError}</p>}
      {statusUpdateError && <p className="text-red-500">Error updating status: {statusUpdateError}</p>}

      {!isLoadingReadyToServe && !readyToServeError && readyToServeOrders.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No orders currently ready for serving.</p>
      )}

      <div className="space-y-4">
        {readyToServeOrders.map(order => (
          <div key={order.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg text-gray-700 dark:text-white">
                Order ...{order.id.slice(-6)} for Table: {order.diningSession?.table?.tableNumber || 'N/A'}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ready since: {new Date(order.updatedAt).toLocaleTimeString()} {/* Or a specific 'readyTime' field if you add one */}
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm mb-3">
              {order.items?.filter(item => item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED).map(item => ( // Show ready/served items
                <li key={item.id} className="text-gray-600 dark:text-gray-300">
                  {item.quantity}x {item.menuItem?.name}
                  {item.specialRequests && <em className="text-xs block text-gray-500 dark:text-gray-400 ml-4"> - {item.specialRequests}</em>}
                </li>
              ))}
            </ul>
            {order.notes && <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-3">Order Notes: {order.notes}</p>}
            <button
              onClick={() => handleMarkServed(order.id)}
              disabled={isUpdatingStatus}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm"
            >
              Mark as Served
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServingQueuePage;