// ./frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './store/slices/authSlice';
import MenuItemsPage from './pages/MenuItemsPage'; // Import

function App() {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    // Use Tailwind classes for a full-height flex column layout
    <div className="flex flex-col min-h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center">
          {isAuthenticated && <Link to="/" /* ... */>Dashboard</Link>}
          {isAuthenticated && <Link to="/menu" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">Menu</Link>} {/* Add Menu Link */}
        </div>
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center">
            {isAuthenticated && (
              <Link to="/" className="text-xl font-semibold text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 mr-6">
                Dashboard
              </Link>
            )}
            {/* Add more primary navigation links here */}
          </div>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center">
                <span className="text-gray-700 dark:text-gray-200 mr-4">
                  Welcome, {staff?.name} ({staff?.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Content area that grows to fill available space */}
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/menu" element={<MenuItemsPage />} /> {/* Add Menu Route */}
            {/* Example for manager-only section of menu management
            <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
              <Route path="/admin/menu/new" element={<div>Add New Menu Item Page</div>} />
              <Route path="/admin/menu/edit/:itemId" element={<div>Edit Menu Item Page</div>} />
            </Route>
            */}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="bg-gray-200 dark:bg-gray-700 text-center p-4 text-sm text-gray-600 dark:text-gray-400">
        © {new Date().getFullYear()} Restaurant Management App
      </footer>
    </div>
  );
}

export default App;