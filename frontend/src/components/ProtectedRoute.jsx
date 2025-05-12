// ./frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && staff && !allowedRoles.includes(staff.role)) {
    // Optional: Redirect to an "Unauthorized" page or back to dashboard
    console.warn(`User role ${staff.role} not in allowed roles: ${allowedRoles.join(', ')}`);
    return <Navigate to="/" replace />; // Or a specific unauthorized page
  }

  return <Outlet />; // Render child routes/component
};

export default ProtectedRoute;