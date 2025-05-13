// ./frontend/src/pages/customer/PublicMenuPage.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../../store/slices/menuItemSlice';

function PublicMenuPage() {
  const dispatch = useDispatch();
  const { items: menuItems, isLoading, error } = useSelector((state) => state.menuItems);

  useEffect(() => {
    // Always fetch only available items for the public menu
    dispatch(fetchMenuItems({ availableOnly: true }));
    return () => {
        dispatch(clearMenuItemError());
    }
  }, [dispatch]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-200">Our Menu</h1>

      {isLoading && <p className="text-center text-blue-500">Loading menu...</p>}
      {error && <p className="text-center text-red-500">Error fetching menu: {error}</p>}
      {!isLoading && !error && menuItems.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400">Our menu is currently being updated. Please check back soon!</p>
      )}

      {!isLoading && !error && menuItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {menuItems.map((item) => (
            // Only display if item.isAvailable is explicitly true,
            // though the fetch should already filter this. Defensive check.
            item.isAvailable && (
                <div key={item.id} className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 flex flex-col transition-transform hover:scale-105">
                {item.imageUrl && (
                    <img
                    src={item.imageUrl || 'https://dummyimage.com/300x200/ccc/000&text=Food+Image'}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-md mb-4 bg-gray-200 dark:bg-gray-700"
                    />
                )}
                <div className="flex-grow">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-blue-400 mb-2">{item.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 min-h-[3em]"> {/* min-h for consistent description height */}
                        {item.description || "Deliciousness awaits."}
                    </p>
                </div>
                <div className="mt-auto">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-3">${parseFloat(item.price).toFixed(2)}</p>
                    {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                        <span key={tag} className="inline-block bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            #{tag}
                        </span>
                        ))}
                    </div>
                    )}
                </div>
                </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default PublicMenuPage;