// backend/src/server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan'; // Optional: for request logging
import { PrismaClient } from '@prisma/client';

// --- Initialization ---

// Load environment variables from .env file
dotenv.config();

// Create an Express application instance
const app = express();

// Instantiate Prisma Client
// It automatically reads the DATABASE_URL from the .env file
export const prisma = new PrismaClient({
  // Optional: Log database queries during development
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});


// --- Middleware ---

// CORS configuration - Allow requests from your frontend
// Adjust origin in production!
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3718', // Get frontend URL from .env or use dev default
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Parse incoming JSON request bodies
app.use(express.json());

// Optional: HTTP request logger middleware (only use in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// --- Basic Routes ---

// Simple health check / root route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Restaurant Management API is running!' });
});

// --- API Routes ---
// TODO: Import and use dedicated route handlers here later
// Example placeholder for future routes:
// import reservationRoutes from './routes/reservationRoutes.js';
// import orderRoutes from './routes/orderRoutes.js';
// import menuRoutes from './routes/menuRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// import staffRoutes from './routes/staffRoutes.js';

// app.use('/api/v1/reservations', reservationRoutes);
// app.use('/api/v1/orders', orderRoutes); // Likely nested under sessions later
// app.use('/api/v1/dining-sessions', /*sessionRoutes*/ ); // Need routes for sessions
// app.use('/api/v1/menu-items', menuRoutes);
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/staff', staffRoutes);


// --- Error Handling Middleware ---
// TODO: Implement more robust error handling later
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack trace to the console
  const statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
  const message = err.message || 'Something went wrong!';
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: message,
      // Optionally include stack trace in development
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  });
});


// --- Start Server ---

const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

// Function to connect to DB and start server
async function startServer() {
  try {
    // Prisma automatically handles connection pooling, but a connect() call
    // can be used to explicitly check the connection on startup.
    await prisma.$connect();
    console.log('Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Node environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database', error);
    process.exit(1); // Exit if DB connection fails
  }
}

startServer();

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  console.log('Prisma Client disconnected.');
  // Close server etc.
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  console.log('Prisma Client disconnected.');
  // Close server etc.
  process.exit(0);
});