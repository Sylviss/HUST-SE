// ./backend/src/controllers/authController.js
import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const staff = await authService.registerStaff(req.body);
    res.status(201).json({ message: 'Staff registered successfully', staff });
  } catch (error) {
    // For specific errors, you might want different status codes
    if (error.message === 'Username already exists' || error.message.startsWith('Invalid role') || error.message.startsWith('Manager role cannot be assigned')) {
      res.status(400).json({ message: error.message });
    } else {
      next(error); // Pass to generic error handler
    }
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const result = await authService.loginStaff(username, password);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid username or password' || error.message.startsWith('Account is inactive')) {
       res.status(401).json({ message: error.message });
    } else {
      next(error);
    }
  }
};