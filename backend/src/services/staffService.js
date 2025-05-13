// ./backend/src/services/staffService.js
import prisma from '../db/prismaClient.js';
import { hashPassword } from '../utils/passwordUtils.js'; // Assuming you might set initial password
import { StaffRole } from '@prisma/client';

// Manager creates a new staff account
export const createStaffByManager = async (staffData) => {
  const { name, username, password, role, isActive = true } = staffData;

  if (!name || !username || !password || !role) {
    throw new Error('Name, username, password, and role are required.');
  }
  if (!Object.values(StaffRole).includes(role)) {
      throw new Error(`Invalid role: ${role}. Valid roles are ${Object.values(StaffRole).join(', ')}`);
  }
  if (password.length < 6) { // Example password policy
      throw new Error('Password must be at least 6 characters long.');
  }


  const existingStaff = await prisma.staff.findUnique({ where: { username } });
  if (existingStaff) {
    throw new Error('Username already exists.');
  }

  const passwordHash = await hashPassword(password);

  const newStaff = await prisma.staff.create({
    data: {
      name,
      username,
      passwordHash,
      role,
      isActive,
    },
    // Select to exclude passwordHash from the returned object
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true }
  });
  return newStaff;
};

// Get all staff members (for Manager view)
export const getAllStaff = async () => {
  return prisma.staff.findMany({
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { name: 'asc' },
  });
};

// Get a single staff member by ID (for Manager view)
export const getStaffById = async (staffId) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!staff) {
    throw new Error('Staff member not found.');
  }
  return staff;
};

// Manager updates a staff account (name, role, isActive)
// Password changes should be a separate, more secure process (e.g., user changes own, or admin triggers reset)
export const updateStaffAccount = async (staffId, updateData) => {
  const { name, role, isActive } = updateData;

  if (role && !Object.values(StaffRole).includes(role)) {
      throw new Error(`Invalid role: ${role}. Valid roles are ${Object.values(StaffRole).join(', ')}`);
  }

  const dataToUpdate = {};
  if (name !== undefined) dataToUpdate.name = name;
  if (role !== undefined) dataToUpdate.role = role;
  if (isActive !== undefined) dataToUpdate.isActive = isActive;

  if (Object.keys(dataToUpdate).length === 0) {
      throw new Error("No update data provided.");
  }

  try {
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: dataToUpdate,
      select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    return updatedStaff;
  } catch (error) {
    if (error.code === 'P2025') { // Prisma error code for record not found during update
      throw new Error('Staff member not found for update.');
    }
    throw error; // Re-throw other errors
  }
};

// Manager deactivates a staff account
export const toggleStaffActiveStatus = async (staffId, isActive) => {
  if (typeof isActive !== 'boolean') {
    throw new Error("isActive status must be true or false.");
  }
  try {
    const staffToUpdate = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffToUpdate) {
      throw new Error('Staff member not found.');
    }
    // Prevent a manager from deactivating themselves if they are the only active manager? (More complex rule for later if needed)

    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { isActive },
      select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    return updatedStaff;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Staff member not found for status update.');
    }
    throw error;
  }
};