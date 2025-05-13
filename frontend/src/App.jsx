// ./frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Page Imports
import CustomerReservationPage from './pages/customer/CustomerReservationPage';
import PublicMenuPage from './pages/customer/PublicMenuPage'; // NEW
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MenuItemsPage from './pages/MenuItemsPage'; // Staff Menu Management/View
import AddNewMenuItemPage from './pages/admin/AddNewMenuItemPage';
import EditMenuItemPage from './pages/admin/EditMenuItemPage';
import TablesPage from './pages/admin/TablesPage';
import AddNewTablePage from './pages/admin/AddNewTablePage';
import EditTablePage from './pages/admin/EditTablePage';
import ReservationsManagementPage from './pages/staff/ReservationsManagementPage';
import TableMapPage from './pages/staff/TableMapPage';
import ActiveSessionsPage from './pages/staff/ActiveSessionsPage';
import OrderTakingPage from './pages/staff/OrderTakingPage';
import KitchenDisplayPage from './pages/staff/KitchenDisplayPage';
import ServingQueuePage from './pages/staff/ServingQueuePage';
import BillingPage from './pages/staff/BillingPage';
import NotFoundPage from './pages/NotFoundPage';
import ReportsPage from './pages/admin/ReportsPage'; // Import


// Components & Utils
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './store/slices/authSlice';
import { StaffRole } from './utils/constants';

function App() {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/'); // Or to homepage '/'
  };

  const staffDashboardPath = "/staff/dashboard";

  // Determine which links to show for authenticated staff members
  const showManagerAdminLinks = isAuthenticated && staff?.role === StaffRole.MANAGER;
  const showReservationLinks = isAuthenticated && (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.CASHIER || staff?.role === StaffRole.WAITER);
  const showSeatingLinks = isAuthenticated && (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER || staff?.role === StaffRole.CASHIER);
  const showActiveSessionsLink = isAuthenticated && (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.WAITER); // Cashier might not need quick link
  const showKitchenLink = isAuthenticated && (staff?.role === StaffRole.KITCHEN_STAFF || staff?.role === StaffRole.MANAGER);
  const showServingQueueLink = isAuthenticated && (staff?.role === StaffRole.WAITER || staff?.role === StaffRole.MANAGER);
  const showStaffMenuLink = isAuthenticated && (staff?.role === StaffRole.MANAGER || staff?.role === StaffRole.KITCHEN_STAFF || staff?.role === StaffRole.WAITER || staff?.role === StaffRole.CASHIER)


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50"> {/* Made navbar sticky */}
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          {/* Left side: Branding and Public Links */}
          <div className="flex items-center">
            {!isAuthenticated && (
              <Link to="/" className="text-xl font-bold text-gray-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 mr-6">
                Ratatouille
              </Link>
            )}
            {/* Conditionally render "Our Menu" public link */}
            {!isAuthenticated && (
              <Link to="/menu-public" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 mr-6">
                Our Menu
              </Link>
            )}
          </div>


          {/* Center: Staff Navigation Links (if authenticated) */}
          {isAuthenticated && staff && (
            <div className="hidden md:flex items-center space-x-4"> {/* Hide on small screens, show on medium+ */}
              <Link to={staffDashboardPath} className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Staff Dashboard</Link>
              {showStaffMenuLink && <Link to="/menu" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Staff Menu View</Link>}
              {showReservationLinks && <Link to="/staff/reservations" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Reservations</Link>}
              {showSeatingLinks && <Link to="/staff/seating" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Seating</Link>}
              {showActiveSessionsLink && <Link to="/staff/active-sessions" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Active Sessions</Link>}
              {showKitchenLink && <Link to="/staff/kitchen" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">KDS</Link>}
              {showServingQueueLink && <Link to="/staff/serving-queue" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Serving</Link>}
              {showManagerAdminLinks && <Link to="/admin/tables" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Table Admin</Link>}
              {showManagerAdminLinks && (
                <Link to="/admin/reports" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">Reports</Link>
              )}
              {/* Add more staff links here */}
            </div>
          )}

          {/* Right side: Login/Logout and User Info */}
          <div className="flex items-center">
            {isAuthenticated && staff ? (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-200 mr-3 hidden sm:inline">
                  Welcome, {staff.name} ({staff.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/staff/login"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
              >
                Staff Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 pt-8"> {/* Added pt-8 for spacing below sticky nav */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<CustomerReservationPage />} />
          <Route path="/menu-public" element={<PublicMenuPage />} />
          <Route path="/staff/login" element={<LoginPage />} />

          {/* Staff Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path={staffDashboardPath} element={<DashboardPage />} />
            <Route path="/menu" element={<MenuItemsPage />} /> {/* Staff Menu View/Management */}

            <Route element={<ProtectedRoute allowedRoles={[StaffRole.MANAGER, StaffRole.WAITER, StaffRole.CASHIER]} />}>
              <Route path="/staff/reservations" element={<ReservationsManagementPage />} />
              <Route path="/staff/seating" element={<TableMapPage />} />
              <Route path="/staff/active-sessions" element={<ActiveSessionsPage />} />
              <Route path="/staff/sessions/:sessionId/orders/new" element={<OrderTakingPage />} />
              <Route path="/staff/sessions/:sessionId/orders/:orderIdForResolution/resolve" element={<OrderTakingPage />} />
              <Route path="/staff/sessions/:sessionId/bill" element={<BillingPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[StaffRole.KITCHEN_STAFF, StaffRole.MANAGER]} />}>
              <Route path="/staff/kitchen" element={<KitchenDisplayPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[StaffRole.WAITER, StaffRole.MANAGER]} />}>
              <Route path="/staff/serving-queue" element={<ServingQueuePage />} />
            </Route>

            {/* Manager Only Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={[StaffRole.MANAGER]} />}>
              {/* <Route path="/admin/menu" element={<MenuItemsPage />} /> // Manager could use /menu, or have a specific admin view */}
              <Route path="/admin/menu/new" element={<AddNewMenuItemPage />} />
              <Route path="/admin/menu/edit/:itemId" element={<EditMenuItemPage />} />
              <Route path="/admin/tables" element={<TablesPage />} />
              <Route path="/admin/tables/new" element={<AddNewTablePage />} />
              <Route path="/admin/tables/edit/:tableId" element={<EditTablePage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              {/* Add /admin/staff-management and /admin/reports routes here */}
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="bg-gray-200 dark:bg-gray-700 text-center p-4 text-sm text-gray-600 dark:text-gray-400">
        © {new Date().getFullYear()} Restaurant Management System
      </footer>
    </div>
  );
}
export default App;