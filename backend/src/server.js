// ./backend/src/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import prisma from './db/prismaClient.js';
import allRoutes from './routes/index.js'; // Import combined routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1', allRoutes); // Prefix all routes with /api/v1

app.get('/api/v1/health', async (req, res) => {
  try {
    const staffCount = await prisma.staff.count();
    res.status(200).json({
      status: 'UP',
      message: 'Backend is healthy',
      db_connection: 'OK',
      staff_in_db: staffCount,
    });
  } catch (error) {
    console.error('Health check DB error:', error);
    res.status(500).json({
      status: 'UP',
      message: 'Backend is healthy',
      db_connection: 'Error',
      error: error.message,
    });
  }
});

// Basic Error Handling Middleware (Add this AFTER your routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
     message: err.message || 'An unexpected error occurred',
     // Optionally include stack in development
     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});


const server = app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);