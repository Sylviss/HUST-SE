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
import { StaffRole } from './utils/constants'; // Create a constants file for roles if you like
import AddNewMenuItemPage from './pages/admin/AddNewMenuItemPage';
import EditMenuItemPage from './pages/admin/EditMenuItemPage';
import EditTablePage from './pages/admin/EditTablePage';
import TablesPage from './pages/admin/TablesPage';
import AddNewTablePage from './pages/admin/AddNewTablePage';
import ReservationsManagementPage from './pages/staff/ReservationsManagementPage'; // Import
import TableMapPage from './pages/staff/TableMapPage'; // Import
import OrderTakingPage from './pages/staff/OrderTakingPage'; // Import
import ActiveSessionsPage from './pages/staff/ActiveSessionsPage'; // Import
import KitchenDisplayPage from './pages/staff/KitchenDisplayPage'; // Import
import ServingQueuePage from './pages/staff/ServingQueuePage'; // 
import BillingPage from './pages/staff/BillingPage'; // Import








function App() {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const canManageSeating = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER || staff?.role === StaffRole.CASHIER;
  const canTakeOrders = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER; // Define who can take orders
  const canManageOrdersAndSessions = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER || staff?.role === StaffRole.CASHIER;
  const isKitchenOrManager = staff?.role === StaffRole.KITCHEN_STAFF || staff?.role === StaffRole.MANAGER;
  const canServeOrders = staff?.role === StaffRole.WAITER || staff?.role === StaffRole.MANAGER;
  const canProcessBills = staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.CASHIER || staff?.role === StaffRole.WAITER;

  return (
    // Use Tailwind classes for a full-height flex column layout
    <div className="flex flex-col min-h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          {/* Left side of the navbar for navigation links */}
          <div className="flex items-center">
            {isAuthenticated && (
              <Link to="/" className="text-xl font-semibold text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 mr-6">
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/menu" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 mr-6"> {/* Added mr-6 for spacing */}
                Menu
              </Link>
            )}
            {isAuthenticated && staff?.role === StaffRole.MANAGER && (
              <Link to="/admin/tables" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 mr-6"> {/* Added mr-6 */}
                Manage Tables
              </Link>
            )}
            {isAuthenticated && (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.CASHIER || staff?.role === StaffRole.WAITER) && (
              <Link to="/staff/reservations" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">
                Manage Reservations
              </Link>
            )}
            {isAuthenticated && canManageSeating && (
              <Link to="/staff/seating" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">
                Seating / Tables
              </Link>
            )}
            {isAuthenticated && canManageOrdersAndSessions && (
              <Link to="/staff/active-sessions" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">
                Active Sessions
              </Link>
            )}
            {isAuthenticated && isKitchenOrManager && (
              <Link to="/staff/kitchen" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">
                Kitchen Display
              </Link>
            )}
            {isAuthenticated && canServeOrders && (
              <Link to="/staff/serving-queue" className="text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 ml-6">
                Serving Queue
              </Link>
            )}
            {/* Add more primary navigation links here as needed, following the pattern */}
          </div>

          {/* Right side of the navbar for Welcome message & Logout/Login */}
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
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.MANAGER]} />}> {/* Use imported enum or string 'MANAGER' */}
              <Route path="/admin/menu/new" element={<AddNewMenuItemPage />} />
              <Route path="/admin/menu/edit/:itemId" element={<EditMenuItemPage />} />
              <Route path="/admin/tables" element={<TablesPage />} />
              <Route path="/admin/tables/new" element={<AddNewTablePage />} />
              <Route path="/admin/tables/edit/:tableId" element={<EditTablePage />} />
              {/* Add other admin routes here */}
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.WAITER]} />}>
              <Route path="/staff/reservations" element={<ReservationsManagementPage />} />
              <Route path="/staff/seating" element={<TableMapPage />} />
              <Route path="/staff/sessions/:sessionId/orders/new" element={<OrderTakingPage />} />
              <Route path="/staff/active-sessions" element={<ActiveSessionsPage />} />
              <Route path="/staff/sessions/:sessionId/orders/new" element={<OrderTakingPage />} />
              <Route path="/staff/sessions/:sessionId/orders/:orderIdForResolution/resolve" element={<OrderTakingPage />} /> {/* NEW RESOLVE ROUTE */}
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.KITCHEN_STAFF, StaffRole.MANAGER]} />}>
              <Route path="/staff/kitchen" element={<KitchenDisplayPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.WAITER, StaffRole.MANAGER]} />}> {/* Ensure correct roles */}
              <Route path="/staff/serving-queue" element={<ServingQueuePage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER]} />}>
              <Route path="/staff/sessions/:sessionId/orders/new" element={<OrderTakingPage />} /> {/* Existing */}
              <Route path="/staff/sessions/:sessionId/bill" element={<BillingPage />} /> {/* NEW Billing Route */}
            </Route>
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