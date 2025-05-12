// ./backend/src/db/prismaClient.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Optional: Log queries for debugging during development
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;