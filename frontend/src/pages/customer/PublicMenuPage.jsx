// ./frontend/src/pages/customer/PublicMenuPage.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems, clearMenuItemError } from '../../store/slices/menuItemSlice';

function PublicMenuPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const { items: menuItems, isLoading, error } = useSelector((state) => state.menuItems);

  useEffect(() => {
    // Always fetch only available items for the public menu
    dispatch(fetchMenuItems({ availableOnly: true }));
    return () => {
        dispatch(clearMenuItemError());
    }
  }, [dispatch]);

  // Filter logic for menu items
  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-200">Our Menu</h1>
      
      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search our menu..."
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

      {isLoading && <p className="text-center text-blue-500">Loading menu...</p>}
      {error && <p className="text-center text-red-500">Error fetching menu: {error}</p>}
      {!isLoading && !error && filteredMenuItems.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400">Our menu is currently being updated. Please check back soon!</p>
      )}

      {!isLoading && !error && filteredMenuItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredMenuItems.map((item) => (
            // Only display if item.isAvailable is explicitly true,
            // though the fetch should already filter this. Defensive check.
            item.isAvailable && (
                <div key={item.id} className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 flex flex-col transition-transform hover:scale-105">
                <div className="w-full h-40 mb-4">
                  <img
                    src={item.imageUrl || 'https://dummyimage.com/300x200/000/fff&text=No+Image'}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-md bg-gray-200 dark:bg-gray-700"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://dummyimage.com/300x200/000/fff&text=No+Image';
                    }}
                  />
                </div>
                <div className="flex-grow">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-blue-400 mb-2">{item.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 min-h-[3em]"> {/* min-h for consistent description height */}
                        {item.description || "Deliciousness awaits."}
                    </p>
                </div>
                <div className="mt-auto">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-3">đ{parseFloat(item.price).toFixed(0)}</p>
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