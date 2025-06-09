// ./frontend/src/pages/MenuItemsPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { fetchMenuItems, deleteMenuItem, updateMenuItemAvailability, clearMenuItemError, clearMenuItemSubmitError } from '../store/slices/menuItemSlice';
import { StaffRole } from '../utils/constants'; // Assuming you created this

function MenuItemsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Initialize navigate
  const { staff } = useSelector((state) => state.auth); // To check role for CRUD actions
  const { items: menuItems, isLoading, error, isSubmitting, submitError } = useSelector((state) => state.menuItems);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Managers and Kitchen Staff might want to see all items (including unavailable ones)
    // Other staff (e.g., Waiters for ordering UI) might only see available ones.
    // The backend /menu-items/all-for-admin is manager only.
    // The backend /menu-items with no filter shows all by default IF called by manager.
    // Let's refine:
    let fetchParams = { availableOnly: true }; // Default for roles like WAITER
    if (staff?.role === StaffRole.MANAGER) {
        fetchParams = { allForManager: true }; // Use the admin route for managers
    } else if (staff?.role === StaffRole.KITCHEN_STAFF) {
        fetchParams = { availableOnly: false }; // Kitchen staff see all, using public route with filter override
                                               // Requires backend /menu-items to respect availableOnly=false
                                               // or a new param like view=kitchen
    }

    dispatch(fetchMenuItems(fetchParams));

    return () => {
        dispatch(clearMenuItemError());
        dispatch(clearMenuItemSubmitError());
    }
  }, [dispatch, staff]);

  const isManager = staff?.role === StaffRole.MANAGER;
  const canToggleAvailability = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.KITCHEN_STAFF;

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      dispatch(deleteMenuItem(itemId));
    }
  };

  const handleToggleAvailability = (item) => {
    dispatch(updateMenuItemAvailability({ itemId: item.id, isAvailable: !item.isAvailable }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Menu Items</h1>
        {isManager && ( // Only Managers can add new items
          <button
            onClick={() => navigate('/admin/menu/new')}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
            disabled={isSubmitting}
          >
            Add New Item
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-blue-500">Loading menu items...</p>}
      {error && <p className="text-red-500">Error fetching menu items: {error}</p>}
      {submitError && <p className="text-red-500 mt-2">Operation Error: {submitError}</p>}

      {!isLoading && !error && filteredMenuItems.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">
          {menuItems.length === 0 ? "No menu items found." : "No menu items match your search."}
        </p>
      )}

      {!isLoading && !error && filteredMenuItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMenuItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
              {item.imageUrl && (
                <img
                  src={item.imageUrl || 'https://dummyimage.com/300x200/000/fff&text=No+Image'}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded-md mb-4 bg-gray-200 dark:bg-gray-700"
                />
              )}
              <h3 className="text-xl font-bold text-gray-700 dark:text-blue-400 mb-2">{item.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 truncate h-10">{item.description || "No description."}</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">đ{parseFloat(item.price).toFixed(0)}</p>
              <p className={`text-sm font-medium ${item.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {item.isAvailable ? 'Available' : 'Unavailable (Sold Out)'}
              </p>
              {item.tags && item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-2">
                {/* Toggle Availability button for Manager or Kitchen Staff */}
                {canToggleAvailability && (
                   <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`w-full text-xs px-3 py-1.5 rounded ${item.isAvailable ? 'bg-gray-400 hover:bg-gray-500' : 'bg-green-500 hover:bg-green-600'} text-white`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : (item.isAvailable ? 'Mark Unavailable' : 'Mark Available')}
                  </button>
                )}
                {/* Edit and Delete buttons only for Manager */}
                {isManager && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/admin/menu/edit/${item.id}`)}
                      className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      disabled={isSubmitting}
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                      disabled={isSubmitting}
                    >
                      Delete Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuItemsPage;