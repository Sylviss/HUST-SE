// ./frontend/src/pages/MenuItemsPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../store/slices/menuItemSlice';
// We'll create MenuItemCard and possibly MenuItemForm later

function MenuItemsPage() {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth); // To check role for CRUD actions
  const { items: menuItems, isLoading, error } = useSelector((state) => state.menuItems);

  useEffect(() => {
    // For a general staff view, fetch only available items
    // Managers might have a different view/fetch for all items
    const fetchParams = staff?.role === 'MANAGER' ? { allForManager: true } : { availableOnly: true };
    dispatch(fetchMenuItems(fetchParams));

    return () => {
        dispatch(clearMenuItemError());
    }
  }, [dispatch, staff]);

  const isManager = staff?.role === 'MANAGER';

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Menu Items</h1>
        {isManager && (
          <button
            // onClick={() => navigate('/admin/menu/new')} // For later
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
          >
            Add New Item
          </button>
        )}
      </div>

      {isLoading && <p className="text-blue-500">Loading menu items...</p>}
      {error && <p className="text-red-500">Error fetching menu items: {error}</p>}
      {!isLoading && !error && menuItems.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No menu items found.</p>
      )}

      {!isLoading && !error && menuItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 transition-transform hover:scale-105">
              {item.imageUrl && (
                <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-40 object-cover rounded-md mb-4" />
              )}
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
                <div className="mt-4 flex justify-end space-x-2">
                  <button className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded">Edit</button>
                  <button className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded">Delete</button>
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