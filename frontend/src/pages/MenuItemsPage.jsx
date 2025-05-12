// ./frontend/src/pages/MenuItemsPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { fetchMenuItems, deleteMenuItem, updateMenuItemAvailability, clearMenuItemError, clearMenuItemSubmitError } from '../store/slices/menuItemSlice';
import { StaffRole } from '../utils/constants'; // Assuming you created this

function MenuItemsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Initialize navigate
  const { staff } = useSelector((state) => state.auth); // To check role for CRUD actions
  const { items: menuItems, isLoading, error, isSubmitting, submitError  } = useSelector((state) => state.menuItems);

  useEffect(() => {
    const fetchParams = staff?.role === StaffRole.MANAGER ? { allForManager: true } : { availableOnly: true };
    dispatch(fetchMenuItems(fetchParams));
    return () => {
        dispatch(clearMenuItemError());
        dispatch(clearMenuItemSubmitError());
    }
  }, [dispatch, staff]);

  const isManager = staff?.role === StaffRole.MANAGER;

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      dispatch(deleteMenuItem(itemId));
      // Error will be handled by submitError from the slice
    }
  };

  const handleToggleAvailability = (item) => {
    dispatch(updateMenuItemAvailability({ itemId: item.id, isAvailable: !item.isAvailable }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Menu Items</h1>
        {isManager && (
          <button
            onClick={() => navigate('/admin/menu/new')} // Navigate to add new page
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
            disabled={isSubmitting}
          >
            Add New Item
          </button>
        )}
      </div>

      {isLoading && <p className="text-blue-500">Loading menu items...</p>}
      {error && <p className="text-red-500">Error fetching menu items: {error}</p>}
      {submitError && <p className="text-red-500 mt-2">Operation Error: {submitError}</p>}
      {!isLoading && !error && menuItems.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No menu items found.</p>
      )}

      {!isLoading && !error && menuItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 transition-transform hover:scale-105">
              <img
                src={item.imageUrl || 'https://dummyimage.com/300x200/000/fff&text=No+Image'} // Use placeholder if imageUrl is null/undefined/empty
                alt={item.name}
                className="w-full h-40 object-cover rounded-md mb-4 bg-gray-200 dark:bg-gray-700" // Added a background color for when placeholder itself might be slow/fail
              />
              <h3 className="text-xl font-bold text-gray-700 dark:text-blue-400 mb-2">{item.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 truncate">{item.description || "No description available."}</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">${parseFloat(item.price).toFixed(2)}</p>
              <p className={`text-sm font-medium ${item.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {item.isAvailable ? 'Available' : 'Sold Out / Unavailable'}
              </p>
              {item.tags && item.tags.length > 0 && (
                <div className="mt-2">
                  {item.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 mr-2 mb-2">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
{isManager && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/admin/menu/edit/${item.id}`)} // Navigate to edit page
                      className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`w-full text-xs px-3 py-1 rounded ${item.isAvailable ? 'bg-gray-400 hover:bg-gray-500' : 'bg-green-500 hover:bg-green-600'} text-white`}
                    disabled={isSubmitting}
                  >
                    {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuItemsPage;