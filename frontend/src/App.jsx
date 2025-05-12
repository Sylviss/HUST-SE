// ./frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './store/slices/authSlice'; // Import logout action

function App() {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      <nav style={{ padding: '1rem', background: '#eee', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {isAuthenticated && <Link to="/" style={{ marginRight: '1rem' }}>Dashboard</Link>}
          {/* Add more links here for different modules */}
        </div>
        <div>
          {isAuthenticated ? (
            <>
              <span style={{ marginRight: '1rem' }}>Welcome, {staff?.name} ({staff?.role})</span>
              <button onClick={handleLogout} style={{ padding: '0.5rem 1rem'}}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>
      <div style={{ padding: '0 1rem' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}> {/* Wrap protected routes */}
            <Route path="/" element={<DashboardPage />} />
            {/* Add more protected routes here, e.g., for specific roles: */}
            {/* <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
              <Route path="/admin/menu" element={<MenuManagementPage />} />
            </Route> */}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;