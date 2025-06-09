// ./frontend/src/pages/staff/OrderTakingPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../../store/slices/menuItemSlice';
import {
  createOrder,
  clearOrderSubmitError,
  fetchOrdersForSession,
  clearOrderListError,
  updateOrderStatus,
  resolveActionRequiredOrder,
  clearOrderResolveError,
  clearOrderStatusUpdateError
} from '../../store/slices/orderSlice';
import { fetchDiningSessionById, clearSessionCurrentError, clearCurrentSession } from '../../store/slices/diningSessionSlice';
import { OrderStatus, OrderItemStatus, StaffRole } from '../../utils/constants';

function OrderTakingPage() {
  const { sessionId, orderIdForResolution } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const activeOrderIdFromParamsOrState = orderIdForResolution || location.state?.orderToResolve?.id;
  const isResolveMode = !!activeOrderIdFromParamsOrState;

  const { staff } = useSelector((state) => state.auth);
  const { items: menuItems, isLoading: menuLoading, error: menuError } = useSelector((state) => state.menuItems);
  const { currentSession, isLoadingCurrent: sessionDetailsLoading, currentError: sessionDetailsError } = useSelector(state => state.diningSessions);
  const {
    ordersBySession,
    isSubmitting: orderSubmitting,
    submitError: orderSubmitError,
    isResolving,
    resolveError,
    isUpdatingStatus: statusUpdating,
    statusUpdateError
  } = useSelector((state) => state.orders);

  const [draftOrderItems, setDraftOrderItems] = useState([]);
  const [overallOrderNotes, setOverallOrderNotes] = useState('');

  const sessionOrders = useMemo(() => ordersBySession[sessionId] || [], [ordersBySession, sessionId]);

  const existingOrderToResolve = useMemo(() => {
    if (isResolveMode && activeOrderIdFromParamsOrState) {
      return sessionOrders.find(o => o.id === activeOrderIdFromParamsOrState);
    }
    return null;
  }, [isResolveMode, activeOrderIdFromParamsOrState, sessionOrders]);

  useEffect(() => {
    dispatch(fetchMenuItems({ availableOnly: true }));
    if (sessionId) {
        dispatch(fetchDiningSessionById(sessionId));
        dispatch(fetchOrdersForSession(sessionId));
    }
    return () => {
        dispatch(clearMenuItemError());
        dispatch(clearOrderSubmitError());
        dispatch(clearOrderListError());
        dispatch(clearSessionCurrentError());
        dispatch(clearCurrentSession());
        dispatch(clearOrderStatusUpdateError());
        dispatch(clearOrderResolveError());
    }
  }, [dispatch, sessionId]);

  useEffect(() => {
    if (isResolveMode && existingOrderToResolve) {
      setDraftOrderItems(existingOrderToResolve.items.map(item => ({
        orderItemId: item.id,
        menuItemId: item.menuItem.id, // Assumes menuItem is included when fetching order
        name: item.menuItem.name,
        price: parseFloat(item.priceAtOrderTime || item.menuItem.price), // Prefer priceAtOrderTime
        quantity: item.quantity,
        specialRequests: item.specialRequests || '',
        status: item.status,
        isExistingItem: true,
        markedForCancellation: false, // Initialize
        markedForRemoval: false      // Initialize
      })));
      setOverallOrderNotes(existingOrderToResolve.notes || '');
    } else if (!isResolveMode) {
        setDraftOrderItems([]);
        setOverallOrderNotes('');
    }
  }, [isResolveMode, existingOrderToResolve]);

  const hasUnresolvedSoldOutItems = useMemo(() => {
    if (!isResolveMode) return false;
    return draftOrderItems.some(
      item => item.isExistingItem && item.status === OrderItemStatus.SOLD_OUT && !item.markedForCancellation && item.quantity > 0 // quantity > 0 means it's not marked for removal by setting qty to 0
    );
  }, [isResolveMode, draftOrderItems]);


  const handleAddItemToDraft = (menuItem) => {
    setDraftOrderItems(prevItems => {
      const existingDraftItem = prevItems.find(item => !item.isExistingItem && item.menuItemId === menuItem.id && !item.markedForCancellation && !item.markedForRemoval);
      if (existingDraftItem) {
        return prevItems.map(item =>
          item.menuItemId === menuItem.id && !item.isExistingItem ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity: 1,
          specialRequests: '',
          isExistingItem: false, // Flag for new items in draft
          status: OrderItemStatus.PENDING // Default for new draft items
        }];
      }
    });
  };

  const handleUpdateDraftItem = (idToMatchKey, value, field) => { // idToMatchKey is either menuItemId or orderItemId
    setDraftOrderItems(prevItems =>
      prevItems.map(item => {
        const currentItemKey = item.isExistingItem ? item.orderItemId : item.menuItemId;
        if (currentItemKey === idToMatchKey) {
          if (field === 'quantity') {
            const newQuantity = parseInt(value, 10);
            if (isResolveMode && newQuantity < 1) return { ...item, quantity: 0, markedForRemoval: true };
            return { ...item, quantity: Math.max(1, newQuantity), markedForRemoval: false };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveDraftItem = (idToMatchKey) => {
    setDraftOrderItems(prevItems =>
      prevItems.map(item => {
        const currentItemKey = item.isExistingItem ? item.orderItemId : item.menuItemId;
        if (currentItemKey === idToMatchKey) {
          if (isResolveMode && item.isExistingItem) {
            // Toggle cancellation mark for existing items in resolve mode
            return { ...item, markedForCancellation: !item.markedForCancellation, quantity: !item.markedForCancellation ? 0 : item.quantity || 1 };
          } else {
            // For non-existing items or in new order mode, mark for complete removal (will be filtered out)
            return { ...item, markedForRemoval: true };
          }
        }
        return item;
      }).filter(item => !item.markedForRemoval || item.isExistingItem) // Keep existing items even if "removed" from draft for now
    );
  };


  const calculateDraftTotal = () => {
    return draftOrderItems
      .filter(item => !item.markedForCancellation && item.quantity > 0) // Only count items not cancelled and with quantity > 0
      .reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(0);
  };

  const handleSubmitOrderOrChanges = async () => {
    const activeDraftItemsForSubmission = draftOrderItems.filter(item => !item.markedForCancellation && item.quantity > 0);

    if (activeDraftItemsForSubmission.length === 0 && !isResolveMode) {
      alert('Please add items to the order.');
      return;
    }
    if (activeDraftItemsForSubmission.length === 0 && isResolveMode) {
      if (!window.confirm("You are submitting an order with no active items (all previous items might be cancelled or new draft is empty). This might cancel the original order if all items are removed. Proceed?")) {
        return;
      }
    }
    
    if (isResolveMode && hasUnresolvedSoldOutItems) {
      alert('Please cancel or replace all SOLD OUT items before submitting changes.');
      return;
    }
    if (isResolveMode && activeOrderIdFromParamsOrState) {
      const resolutionData = {
        itemsToCancelIds: draftOrderItems.filter(item => item.isExistingItem && item.markedForCancellation).map(item => item.orderItemId),
        itemsToUpdate: draftOrderItems.filter(item => item.isExistingItem && !item.markedForCancellation && item.quantity > 0).map(item => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          specialRequests: item.specialRequests
        })),
        itemsToAdd: draftOrderItems.filter(item => !item.isExistingItem && !item.markedForCancellation && item.quantity > 0).map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialRequests: item.specialRequests
        }))
      };
      const resultAction = await dispatch(resolveActionRequiredOrder({ orderId: activeOrderIdFromParamsOrState, resolutionData }));
      
      
      if (resolveActionRequiredOrder.fulfilled.match(resultAction)) {
        alert('Order changes submitted successfully!');
        navigate(`/staff/active-sessions`); // Or back to session details / KDS
      }
    } else {
      const itemsData = activeDraftItemsForSubmission.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialRequests: item.specialRequests,
      }));
      const resultAction = await dispatch(createOrder({ sessionId, itemsData, notes: overallOrderNotes }));
      if (createOrder.fulfilled.match(resultAction)) {
        alert('Order submitted successfully!');
        setDraftOrderItems([]);
        setOverallOrderNotes('');
        dispatch(fetchOrdersForSession(sessionId));
      }
    }
  };

  const handleCancelEntireOrder = async (orderIdToCancel) => {
    const order = sessionOrders.find(o => o.id === orderIdToCancel);
    if (!order) return;

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ACTION_REQUIRED) {
        alert(`This order is already ${order.status} and cannot be cancelled directly here.`);
        return;
    }

    if (window.confirm(`Are you sure you want to cancel the entire Order ...${orderIdToCancel.slice(-6)}?`)) {
      const resultAction = await dispatch(updateOrderStatus({ orderId: orderIdToCancel, status: OrderStatus.CANCELLED }));
      if (updateOrderStatus.fulfilled.match(resultAction)) {
        alert('Order cancelled successfully.');
        // The slice should handle removing it from kitchenOrders, and updating it in sessionOrders
        // If not, an explicit fetchOrdersForSession might be needed, but better if slice handles it.
        if (sessionId) dispatch(fetchOrdersForSession(sessionId));
      }
    }
  };

  if (sessionDetailsLoading || (isResolveMode && !existingOrderToResolve && !orderSubmitError && !resolveError && sessionOrders.length === 0 && !activeOrderIdFromParamsOrState) ) {
    return <p className="text-center text-lg text-blue-500">Loading data for session {sessionId && `...${sessionId.slice(-6)}`}...</p>;
  }
  if (sessionDetailsError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500 text-lg">Error loading session details: {sessionDetailsError}</p>
        <button onClick={() => dispatch(fetchDiningSessionById(sessionId))} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
      </div>
    );
  }
  if (!currentSession) {
    return <p className="text-center text-lg text-gray-600 dark:text-gray-400">Dining session data not available.</p>;
  }
  if (currentSession.id !== sessionId) {
    return <p className="text-center text-lg text-orange-500">Session data mismatch. Please wait or try navigating again.</p>;
  }
  if (isResolveMode && !existingOrderToResolve && !orderSubmitError && !resolveError) {
      return <p className="text-center text-lg">Loading order to resolve or order not found...</p>;
  }
  if (isResolveMode && !existingOrderToResolve && (orderSubmitError || resolveError)) {
      return <p className="text-center text-lg text-red-500">Could not load the order for resolution. Error: {resolveError || orderSubmitError}</p>
  }

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Menu Item Selection */}
      <div className="md:col-span-2">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {isResolveMode && existingOrderToResolve ? `Resolve Order ...${existingOrderToResolve.id.slice(-6)}` : `Take Order`} for Table {currentSession.table?.tableNumber || 'N/A'}
        </h2>
        {menuLoading && <p>Loading menu...</p>}
        {menuError && <p className="text-red-500">Error loading menu: {menuError}</p>}
        {!menuLoading && !menuError && menuItems.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No menu items available to order.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2">
          {menuItems.map(item => (
            <div key={item.id} className={`p-4 border rounded-lg shadow bg-white dark:bg-gray-800 ${!item.isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}>
              <h3 className="font-bold text-gray-700 dark:text-white">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">đ{parseFloat(item.price).toFixed(0)}</p>
              {!item.isAvailable && <p className="text-xs text-red-500 dark:text-red-400 font-semibold">(Currently Unavailable)</p>}
              <button
                onClick={() => item.isAvailable && handleAddItemToDraft(item)}
                disabled={!item.isAvailable || orderSubmitting || isResolving}
                className={`mt-2 w-full px-3 py-1.5 text-white text-sm rounded-md ${
                    item.isAvailable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'
                } disabled:opacity-70`}
              >
                {item.isAvailable ? 'Add to Order' : 'Unavailable'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Current Draft Order & Submission */}
      <div className="md:col-span-1 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow max-h-[85vh] flex flex-col">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {isResolveMode ? 'Proposed Order Changes' : 'Current Order Draft'}
        </h3>
        {draftOrderItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{isResolveMode ? 'Modify items below or add new ones.' : 'No items added yet.'}</p>
        ) : (
          <div className="space-y-3 flex-grow overflow-y-auto mb-4 pr-2">
            {draftOrderItems.map(draftItem => (
              <div key={draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId}
                   className={`p-3 border-b dark:border-gray-600 relative 
                              ${draftItem.status === OrderItemStatus.SOLD_OUT ? 'bg-red-100 dark:bg-red-900 opacity-80' : ''} 
                              ${draftItem.markedForCancellation ? 'line-through bg-gray-200 dark:bg-gray-600 opacity-60' : ''}`}
              >
                {draftItem.status === OrderItemStatus.SOLD_OUT && (
                    <span className="absolute top-1 right-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">SOLD OUT</span>
                )}
                <div className="flex justify-between items-center">
                  <span className={`font-medium text-gray-700 dark:text-gray-200 text-sm ${draftItem.status === OrderItemStatus.SOLD_OUT ? 'text-red-700 dark:text-red-300' : ''}`}>
                    {draftItem.name}
                  </span>
                  <button
                    onClick={() => handleRemoveDraftItem(draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId)}
                    disabled={orderSubmitting || isResolving || (draftItem.status === OrderItemStatus.SOLD_OUT && !isResolveMode)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold disabled:opacity-50"
                  >
                    {isResolveMode && draftItem.isExistingItem ? (draftItem.markedForCancellation ? 'Undo Cancel' : 'Cancel This Item') : 'Remove'}
                  </button>
                </div>

                {!(draftItem.status === OrderItemStatus.SOLD_OUT || draftItem.markedForCancellation) && (
                  <>
                    <div className="flex items-center mt-1 space-x-2">
                      <label htmlFor={`qty-${draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId}`} className="text-xs text-gray-500 dark:text-gray-400">Qty:</label>
                      <input
                        id={`qty-${draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId}`}
                        type="number"
                        min="1" // For new items, quantity should be >= 1. For resolving, we allow 0 via markedForRemoval.
                        value={draftItem.quantity}
                        onChange={(e) => handleUpdateDraftItem(draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId, 'quantity', e.target.value)}
                        className="w-16 px-1 py-0.5 border rounded dark:bg-gray-600 dark:border-gray-500 text-sm text-center dark:text-white"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">đ{(draftItem.price * draftItem.quantity).toFixed(0)}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Special requests..."
                      value={draftItem.specialRequests}
                      onChange={(e) => handleUpdateDraftItem(draftItem.isExistingItem ? draftItem.orderItemId : draftItem.menuItemId, 'specialRequests', e.target.value)}
                      className="mt-1 w-full px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500 text-xs dark:text-white"
                    />
                  </>
                )}
                 {draftItem.status === OrderItemStatus.SOLD_OUT && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">This item is sold out and cannot be fulfilled as is.</p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto pt-4 border-t dark:border-gray-600">
          <textarea
            placeholder="Overall order notes..."
            value={overallOrderNotes}
            onChange={(e) => setOverallOrderNotes(e.target.value)}
            rows="2"
            className="w-full px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500 text-sm mb-3 dark:text-white"
          />
          <div className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-200">
            Draft Total: đ{calculateDraftTotal()}
          </div>
          {orderSubmitError && <p className="text-red-500 text-sm mb-2">Submit Error: {orderSubmitError}</p>}
          {resolveError && <p className="text-red-500 text-sm mb-2">Resolve Error: {resolveError}</p>}
          {isResolveMode && hasUnresolvedSoldOutItems && (
            <p className="text-orange-500 text-sm mb-2">
              There are unresolved SOLD OUT items. Please cancel them or replace them.
            </p>
          )}
          <button
            onClick={handleSubmitOrderOrChanges}
            disabled={
              orderSubmitting ||
              isResolving ||
              (isResolveMode && hasUnresolvedSoldOutItems) || // <-- NEW CONDITION
              (draftOrderItems.filter(item => !item.markedForCancellation && item.quantity > 0).length === 0 && !isResolveMode)
            }
            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md disabled:opacity-50"
          >
            {isResolving ? 'Submitting Changes...' : (orderSubmitting ? 'Submitting New Order...' : (isResolveMode ? 'Submit Order Changes' : 'Submit Order to Kitchen'))}
          </button>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Existing Orders for this Session:</h4>
          {statusUpdateError && <p className="text-xs text-red-500 mb-2">Update Error: {statusUpdateError}</p>}
          {sessionOrders.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No orders submitted yet.</p>}
          <ul className="text-xs space-y-2 max-h-40 overflow-y-auto pr-2">
            {sessionOrders.map(order => (
              <li key={order.id} className="p-2 bg-gray-100 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300">
                <div className="flex justify-between items-center">
                  <span>Order ID: ...{order.id.slice(-6)}</span>
                  <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      order.status === OrderStatus.PENDING ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200' :
                      /* ... other status colors ... */
                      order.status === OrderStatus.ACTION_REQUIRED ? 'bg-orange-200 text-orange-800 dark:bg-orange-700 dark:text-orange-200' :
                      'bg-gray-200 text-gray-800 dark:bg-gray-500 dark:text-gray-300'
                    }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xxs text-gray-500 dark:text-gray-400">
                  {order.items?.length || 0} items - Total: đ{order.items?.reduce((sum, i) => sum + (i.priceAtOrderTime * i.quantity), 0).toFixed(0) || '0.00'}
                </div>
                {(order.status === OrderStatus.PENDING || order.status === OrderStatus.ACTION_REQUIRED) &&
                  (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER || staff?.role === StaffRole.CASHIER) && (
                  <div className="mt-1 space-x-1">
                    <button
                      onClick={() => handleCancelEntireOrder(order.id)}
                      disabled={statusUpdating}
                      className="text-xxs px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      {statusUpdating && existingOrderToResolve?.id === order.id ? 'Processing...' : 'Cancel Full Order'}
                    </button>
                    {order.status === OrderStatus.ACTION_REQUIRED && (
                         <button
                            onClick={() => navigate(`/staff/sessions/${sessionId}/orders/${order.id}/resolve`, { state: { orderToResolve: order }})}
                            className="text-xxs px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded"
                         >
                            Resolve Items
                         </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default OrderTakingPage;