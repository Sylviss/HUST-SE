// ./frontend/src/pages/staff/OrderTakingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../../store/slices/menuItemSlice';
import { createOrder, clearOrderSubmitError, fetchOrdersForSession, clearOrderListError } from '../../store/slices/orderSlice';
import { fetchDiningSessionById, clearSessionCurrentError, clearCurrentSession } from '../../store/slices/diningSessionSlice';

function OrderTakingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { staff } = useSelector((state) => state.auth);
  const { items: menuItems, isLoading: menuLoading, error: menuError } = useSelector((state) => state.menuItems);
  const {
    currentSession,
    isLoadingCurrent: sessionDetailsLoading,
    currentError: sessionDetailsError
  } = useSelector(state => state.diningSessions);
  const { ordersBySession, isSubmitting: orderSubmitting, submitError: orderSubmitError } = useSelector((state) => state.orders);

  const [draftOrderItems, setDraftOrderItems] = useState([]); // { menuItemId, name, price, quantity, specialRequests }
  const [overallOrderNotes, setOverallOrderNotes] = useState('');

  const sessionOrders = ordersBySession[sessionId] || [];

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
    }
  }, [dispatch, sessionId]);

  // --- Start of Re-Implemented Handler Functions ---
  const handleAddItemToDraft = (menuItem) => {
    setDraftOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.menuItemId === menuItem.id);
      if (existingItem) {
        // Increase quantity if item already in draft
        return prevItems.map(item =>
          item.menuItemId === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Add new item to draft
        return [...prevItems, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price), // Ensure price is a number
          quantity: 1,
          specialRequests: ''
        }];
      }
    });
  };

  const handleUpdateDraftItem = (menuItemId, field, value) => {
    setDraftOrderItems(prevItems =>
      prevItems.map(item => {
        if (item.menuItemId === menuItemId) {
          if (field === 'quantity') {
            const newQuantity = parseInt(value, 10);
            return { ...item, quantity: Math.max(1, newQuantity) }; // Ensure quantity is at least 1
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveDraftItem = (menuItemId) => {
    setDraftOrderItems(prevItems => prevItems.filter(item => item.menuItemId !== menuItemId));
  };

  const calculateDraftTotal = () => {
    return draftOrderItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const handleSubmitOrder = async () => {
    if (draftOrderItems.length === 0) {
      alert('Please add items to the order.');
      return;
    }
    // Ensure all items have valid quantities (should be handled by input, but good to check)
    const itemsAreValid = draftOrderItems.every(item => item.quantity > 0);
    if(!itemsAreValid){
        alert('Some items have invalid quantities. Please correct them.');
        return;
    }

    const itemsData = draftOrderItems.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      specialRequests: item.specialRequests,
    }));

    const resultAction = await dispatch(createOrder({ sessionId, itemsData, notes: overallOrderNotes }));
    if (createOrder.fulfilled.match(resultAction)) {
      alert('Order submitted successfully!');
      setDraftOrderItems([]); // Clear draft
      setOverallOrderNotes('');
      dispatch(fetchOrdersForSession(sessionId)); // Refresh the list of existing orders for this session
    }
    // Error is handled by orderSubmitError from the slice and displayed in the UI
  };
  // --- End of Re-Implemented Handler Functions ---

  if (sessionDetailsLoading) {
    return <p className="text-center text-lg text-blue-500">Loading session details for {sessionId && `...${sessionId.slice(-6)}`}...</p>;
  }

  if (sessionDetailsError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500 text-lg">Error loading session details: {sessionDetailsError}</p>
        <button onClick={() => dispatch(fetchDiningSessionById(sessionId))} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    );
  }

  if (!currentSession) {
    return <p className="text-center text-lg text-gray-600 dark:text-gray-400">Dining session data not available.</p>;
  }

  if (currentSession.id !== sessionId) {
    console.error('CRITICAL: Session ID mismatch. URL sessionId:', sessionId, 'Redux currentSession.id:', currentSession.id);
    return <p className="text-center text-lg text-red-600">Critical error: Session data mismatch. Please navigate back and try again.</p>;
  }

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Menu Item Selection */}
      <div className="md:col-span-2">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Take Order for Table {currentSession.table?.tableNumber || 'N/A'} (Session: ...{sessionId.slice(-6)})
        </h2>
        {menuLoading && <p>Loading menu...</p>}
        {menuError && <p className="text-red-500">Error loading menu: {menuError}</p>}
        {!menuLoading && !menuError && menuItems.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No menu items available to order.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar */}
          {menuItems.map(item => (
            <div key={item.id} className="p-4 border rounded-lg shadow bg-white dark:bg-gray-800">
              <h3 className="font-bold text-gray-700 dark:text-white">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">${parseFloat(item.price).toFixed(2)}</p>
              <button
                onClick={() => handleAddItemToDraft(item)}
                className="mt-2 w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md"
              >
                Add to Order
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Current Draft Order & Submission */}
      <div className="md:col-span-1 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow max-h-[85vh] flex flex-col">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Current Order Draft</h3>
        {draftOrderItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No items added yet.</p>
        ) : (
          <div className="space-y-3 flex-grow overflow-y-auto mb-4 pr-2"> {/* Added pr-2 for scrollbar */}
            {draftOrderItems.map(item => (
              <div key={item.menuItemId} className="p-3 border-b dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{item.name}</span>
                  <button onClick={() => handleRemoveDraftItem(item.menuItemId)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                </div>
                <div className="flex items-center mt-1 space-x-2">
                  <label htmlFor={`qty-${item.menuItemId}`} className="text-xs text-gray-500 dark:text-gray-400">Qty:</label>
                  <input
                    id={`qty-${item.menuItemId}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateDraftItem(item.menuItemId, 'quantity', e.target.value)}
                    className="w-16 px-1 py-0.5 border rounded dark:bg-gray-600 dark:border-gray-500 text-sm text-center dark:text-white"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <input
                  type="text"
                  placeholder="Special requests..."
                  value={item.specialRequests}
                  onChange={(e) => handleUpdateDraftItem(item.menuItemId, 'specialRequests', e.target.value)}
                  className="mt-1 w-full px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500 text-xs dark:text-white"
                />
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
            Total: ${calculateDraftTotal()}
          </div>
          {orderSubmitError && <p className="text-red-500 text-sm mb-2">{orderSubmitError}</p>}
          <button
            onClick={handleSubmitOrder}
            disabled={orderSubmitting || draftOrderItems.length === 0}
            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md disabled:opacity-50"
          >
            {orderSubmitting ? 'Submitting...' : 'Submit Order to Kitchen'}
          </button>
        </div>
        
        <div className="mt-6">
            <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Existing Orders for this Session:</h4>
            {sessionOrders.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No orders submitted yet for this session.</p>}
            <ul className="text-xs space-y-1 max-h-32 overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar */}
                {sessionOrders.map(order => (
                    <li key={order.id} className="p-1 bg-gray-100 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300">
                        Order ID: ...{order.id.slice(-6)} - Status: {order.status} ({order.items?.length || 0} items)
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
}

export default OrderTakingPage;