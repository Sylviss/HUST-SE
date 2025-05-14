// ./frontend/src/pages/staff/KitchenDisplayPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchKitchenOrders,
  updateOrderStatus,
  updateOrderItemStatus, // If kitchen can update individual item status
  clearKitchenOrderError,
  clearOrderStatusUpdateError
} from '../../store/slices/orderSlice';
import { StaffRole, OrderStatus, OrderItemStatus } from '../../utils/constants';

function KitchenDisplayPage() {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const {
    kitchenOrders,
    isLoadingKitchen,
    kitchenError,
    isUpdatingStatus,
    statusUpdateError
  } = useSelector((state) => state.orders);

  // Auto-refresh interval (e.g., every 30 seconds)
  const REFRESH_INTERVAL = 5000; // 30 seconds

  useEffect(() => {
    dispatch(fetchKitchenOrders()); // Initial fetch
    const intervalId = setInterval(() => {
      dispatch(fetchKitchenOrders());
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
      dispatch(clearKitchenOrderError());
      dispatch(clearOrderStatusUpdateError());
    };
  }, [dispatch]);
  
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    dispatch(updateOrderStatus({ orderId, status: newStatus }));
  };

  const handleUpdateOrderItemStatus = (orderItemId, newStatus) => {
     // Example: if kitchen staff marks an item as preparing or ready individually
    dispatch(updateOrderItemStatus({ orderItemId, status: newStatus }));
  };

  if (staff?.role !== StaffRole.KITCHEN_STAFF && staff?.role !== StaffRole.MANAGER) {
    return <p className="text-red-500 p-4">Access Denied. Kitchen display is for Kitchen Staff and Managers only.</p>;
  }

  // Group orders by status for display (e.g., PENDING vs. PREPARING)
  const pendingOrders = kitchenOrders.filter(o => o.status === OrderStatus.PENDING);
  const preparingOrders = kitchenOrders.filter(o => o.status === OrderStatus.PREPARING);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Kitchen Order Display</h1>

      {isLoadingKitchen && kitchenOrders.length === 0 && <p>Loading kitchen orders...</p>}
      {kitchenError && <p className="text-red-500">Error fetching orders: {kitchenError}</p>}
      {statusUpdateError && <p className="text-red-500">Error updating status: {statusUpdateError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PENDING Orders Column */}
        <div>
          <h2 className="text-2xl font-semibold mb-3 text-yellow-600 dark:text-yellow-400">Pending</h2>
          {pendingOrders.length === 0 && !isLoadingKitchen && <p className="text-gray-500 dark:text-gray-400">No pending orders.</p>}
          <div className="space-y-4">
            {pendingOrders.map(order => (
              <div key={order.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-700 dark:text-white">
                        Order ...{order.id.slice(-6)} (Table: {order.diningSession?.table?.tableNumber || 'N/A'})
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.orderTime).toLocaleTimeString()}
                    </span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm mb-3">
                  {order.items?.map(item => (
                    <li key={item.id} className="text-gray-600 dark:text-gray-300">
                      {item.quantity}x {item.menuItem?.name}
                      {item.specialRequests && <em className="text-xs block text-gray-500 dark:text-gray-400 ml-4"> - {item.specialRequests}</em>}
                      (Status: {item.status})
                    </li>
                  ))}
                </ul>
                {order.notes && <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-3">Order Notes: {order.notes}</p>}
                <button
                  onClick={() => handleUpdateOrderStatus(order.id, OrderStatus.PREPARING)}
                  disabled={isUpdatingStatus}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                >
                  Start Preparing Order
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PREPARING Orders Column */}
        <div>
          <h2 className="text-2xl font-semibold mb-3 text-blue-600 dark:text-blue-400">Preparing</h2>
          {preparingOrders.length === 0 && !isLoadingKitchen && <p className="text-gray-500 dark:text-gray-400">No orders currently being prepared.</p>}
          <div className="space-y-4">
            {preparingOrders.map(order => (
              <div key={order.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                {/* ... (similar display structure as PENDING orders) ... */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-700 dark:text-white">
                        Order ...{order.id.slice(-6)} (Table: {order.diningSession?.table?.tableNumber || 'N/A'})
                    </h3>
                     <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.orderTime).toLocaleTimeString()}
                    </span>
                </div>
                 <ul className="list-disc list-inside space-y-1 text-sm mb-3">
                  {order.items?.map(item => (
                    <li key={item.id} className="text-gray-600 dark:text-gray-300">
                      {item.quantity}x {item.menuItem?.name} (Status: {item.status})
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpdateOrderStatus(order.id, OrderStatus.READY)}
                  disabled={isUpdatingStatus}
                  className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
                >
                  Mark Order Ready
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitchenDisplayPage;