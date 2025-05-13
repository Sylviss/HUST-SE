// ./frontend/src/pages/customer/PublicMenuPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../../store/slices/menuItemSlice'; // Reusing staff slice for now

function PublicMenuPage() {
  const dispatch = useDispatch();
  const { items: menuItems, isLoading, error } = useSelector((state) => state.menuItems);

  useEffect(() => {
    dispatch(fetchMenuItems({ availableOnly: true })); // Only show available items
    return () => {
        dispatch(clearMenuItemError());
    }
  }, [dispatch]);

  return (
    <div>
      <h1 className="text-4xl font-bold my-8 text-center text-gray-800 dark:text-gray-100">Our Menu</h1>
      {isLoading && <p className="text-center">Loading menu...</p>}
      {error && <p className="text-center text-red-500">Error loading menu: {error}</p>}
      {!isLoading && !error && menuItems.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400">Our menu is currently being updated. Please check back soon!</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {menuItems.filter(item => item.isAvailable).map((item) => ( // Double check filter here if API already filters
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {item.imageUrl && (
                <img src={item.imageUrl || 'https://dummyimage.com/600x400/000/fff&text=Food+Image'} alt={item.name} className="w-full h-48 object-cover rounded-lg mb-4"/>
            )}
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-white mb-2">{item.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 h-12 overflow-hidden">{item.description || "Delicious offering from our kitchen."}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">${parseFloat(item.price).toFixed(2)}</p>
             {item.tags && item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map(tag => (
                    <span key={tag} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    #{tag}
                    </span>
                ))}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicMenuPage;