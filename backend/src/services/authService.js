// ./backend/src/services/authService.js
import prisma from '../db/prismaClient.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/jwtUtils.js';
import { StaffRole } from '@prisma/client'; // Prisma generates enums

export const registerStaff = async (staffData) => {
  const { name, username, password, role } = staffData;

  // Check if username already exists
  const existingStaff = await prisma.staff.findUnique({
    where: { username },
  });
  if (existingStaff) {
    throw new Error('Username already exists');
  }

  // For the very first user, make them a MANAGER, otherwise restrict roles
  const staffCount = await prisma.staff.count();
  let assignedRole = role;
  if (staffCount === 0) {
    assignedRole = StaffRole.MANAGER; // Ensure the first user is a Manager
    console.log(`First staff member registered. Assigning MANAGER role to ${username}.`);
  } else if (role === StaffRole.MANAGER && staffCount > 0) {
    // Prevent creating more managers through this generic endpoint for now
    // Manager creation should be a protected admin action later
    throw new Error('Manager role cannot be assigned through this endpoint after initial setup.');
  }

  if (!Object.values(StaffRole).includes(assignedRole)) {
     throw new Error(`Invalid role: ${assignedRole}. Valid roles are ${Object.values(StaffRole).join(', ')}`);
  }


  const hashedPassword = await hashPassword(password);

  const newStaff = await prisma.staff.create({
    data: {
      name,
      username,
      passwordHash: hashedPassword,
      role: assignedRole, // Use the enum from Prisma
    },
  });

  // Don't return passwordHash
  const { passwordHash, ...staffWithoutPassword } = newStaff;
  return staffWithoutPassword;
};

export const loginStaff = async (username, password) => {
  const staff = await prisma.staff.findUnique({
    where: { username },
  });

  if (!staff) {
    throw new Error('Invalid username or password');
  }

  const isPasswordValid = await comparePassword(password, staff.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  if (!staff.isActive) {
    throw new Error('Account is inactive. Please contact an administrator.');
  }

  const tokenPayload = {
    staffId: staff.id,
    username: staff.username,
    role: staff.role,
  };
  const token = generateToken(tokenPayload);

  const { passwordHash, ...staffWithoutPassword } = staff;
  return { token, staff: staffWithoutPassword };
};