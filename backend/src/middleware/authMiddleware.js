// ./backend/src/middleware/authMiddleware.js
import { verifyToken } from '../utils/jwtUtils.js';
import prisma from '../db/prismaClient.js';
import { StaffRole } from '@prisma/client'; // Import enum if not already

export const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token required. Please login.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing.' });
  }

  const decodedPayload = verifyToken(token);
  if (!decodedPayload) {
    return res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
  }

  try {
    // Optionally, fetch the user from DB to ensure they still exist and are active
    const staff = await prisma.staff.findUnique({
      where: { id: decodedPayload.staffId },
    });

    if (!staff || !staff.isActive) {
      return res.status(401).json({ message: 'User not found or account inactive.' });
    }

    // Attach staff information (excluding password) to the request object
    req.staff = {
      id: staff.id,
      username: staff.username,
      role: staff.role,
      name: staff.name,
    };
    next();
  } catch (error) {
    console.error('Error during token verification or staff lookup:', error);
    return res.status(500).json({ message: 'Error authenticating user.' });
  }
};

// New function for role-based authorization
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.staff || !req.staff.role) {
      // This should ideally not happen if isAuthenticated runs first
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = req.staff.role; // e.g., 'MANAGER', 'WAITER'

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Role '${userRole}' is not authorized for this resource. Allowed roles: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
};

// Example specific role checks (can be useful shortcuts)
export const isManager = authorizeRoles(StaffRole.MANAGER);
export const isWaiter = authorizeRoles(StaffRole.WAITER);
export const isCashier = authorizeRoles(StaffRole.CASHIER);
export const isKitchenStaff = authorizeRoles(StaffRole.KITCHEN_STAFF);