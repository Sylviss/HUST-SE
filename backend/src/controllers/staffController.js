// ./backend/src/controllers/staffController.js
import * as staffService from '../services/staffService.js';

export const createStaffHandler = async (req, res, next) => {
  try {
    // performingManagerId could be taken from req.staff.id if needed by service for audit
    const newStaff = await staffService.createStaffByManager(req.body);
    res.status(201).json(newStaff);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid role') || error.message.includes('Password must be')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Username already exists.') {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    next(error);
  }
};

export const getAllStaffHandler = async (req, res, next) => {
  try {
    const staffList = await staffService.getAllStaff();
    res.status(200).json(staffList);
  } catch (error) {
    next(error);
  }
};

export const getStaffByIdHandler = async (req, res, next) => {
  try {
    const staffMember = await staffService.getStaffById(req.params.staffId);
    res.status(200).json(staffMember);
  } catch (error) {
    if (error.message === 'Staff member not found.') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const updateStaffHandler = async (req, res, next) => {
  try {
    // performingManagerId could be taken from req.staff.id
    const updatedStaff = await staffService.updateStaffAccount(req.params.staffId, req.body);
    res.status(200).json(updatedStaff);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
     if (error.message.includes('Invalid role') || error.message.includes('No update data')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

export const toggleStaffActiveStatusHandler = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { isActive } = req.body; // Expect { isActive: true/false } in body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive field (boolean) is required.' });
    }
    // Prevent manager from deactivating their own account if they are the one making the request
    if (req.staff.id === staffId && isActive === false) {
        return res.status(400).json({message: "You cannot deactivate your own account."});
    }

    const updatedStaff = await staffService.toggleStaffActiveStatus(staffId, isActive);
    res.status(200).json(updatedStaff);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('must be true or false')) {
        return res.status(400).json({message: error.message});
    }
    next(error);
  }
};