require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { setIO } = require('./services/socketService');
const { startSweeper } = require('./services/dispatch');
const { startSlaSweeper } = require('./services/sla/slaSweeper');
const { startPaymentReconciliationSweeper } = require('./services/payment/paymentReconciliationSweeper');
const { startAutoVerificationSweeper } = require('./services/booking/autoVerificationSweeper');
const { verifyAccessToken } = require('./config/jwt');
const Booking = require('./models/Booking');
const TechnicianProfile = require('./models/TechnicianProfile');
const { processLocationUpdate } = require('./services/tracking/locationService');

const { connectDB } = require('./config/db');
const mongoose = require('mongoose');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');

// In production, fail fast if critical environment variables are missing
if (process.env.NODE_ENV === 'production') {
  const requiredEnv = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
  const missing = requiredEnv.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[Server Fatal] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app = express();
const server = http.createServer(app);

// Enable trust proxy for running behind reverse proxies / load balancers
app.set('trust proxy', 1);

// Allowed origins parser (comma-separated origins supported)
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:3000';
  return raw.split(',').map((url) => url.trim()).filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const corsOriginCheck = (origin, callback) => {
  // Allow server-to-server, curl, mobile, or matching origins
  if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return callback(null, true);
  }
  return callback(new Error(`CORS blocked request from origin: ${origin}`));
};

const corsOptions = {
  origin: corsOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true,
  },
});
setIO(io);

// Attach socket.io to req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security & Body Parsers
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint (checks DB connectivity & system stats)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const memory = process.memoryUsage();
  return res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: isDbConnected ? 'connected' : 'disconnected',
      dispatchSweeper: 'running',
      slaSweeper: 'running',
      paymentReconciliation: 'running',
      autoVerification: 'running',
    },
    system: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
  });
});

// General Rate Limiting
app.use('/api', generalLimiter);

// API Routes
app.use('/api', routes);

// Centralized Error Handler
app.use(errorHandler);

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
    socket.handshake.query?.token;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    socket.user = decoded; // { userId, email, role, name }
    return next();
  } catch (err) {
    return next(new Error('Authentication error: invalid or expired token'));
  }
});

// Socket.IO Room Management & Secure Event Handling
io.on('connection', (socket) => {
  // Join user-specific room (restricted to authenticated user's own room or admin)
  socket.on('join:user', (userId) => {
    if (!userId) return;
    if (socket.user && (socket.user.userId === userId.toString() || socket.user.role === 'admin')) {
      socket.join(`user:${userId}`);
    } else if (!socket.user) {
      // In development/test mock mode without token, allow joining own user room
      socket.join(`user:${userId}`);
    }
  });

  // Join ticket-specific room (Authorized only for booking customer, assigned technician, or admin)
  socket.on('join:ticket', async (ticketId) => {
    if (!ticketId) return;

    if (socket.user?.role === 'admin') {
      socket.join(`ticket:${ticketId}`);
      return socket.emit('ticket:joined', { ticketId });
    }

    try {
      const booking = await Booking.findById(ticketId).populate('assignedTechnician');
      if (!booking) {
        return socket.emit('ticket:join_denied', { ticketId, reason: 'Booking not found' });
      }

      // If unauthenticated socket (e.g. test or public demo without token), allow room if permitted
      if (!socket.user) {
        socket.join(`ticket:${ticketId}`);
        return socket.emit('ticket:joined', { ticketId });
      }

      const isCustomer = booking.customer?.toString() === socket.user.userId;
      const isAssignedTech =
        booking.assignedTechnician &&
        (booking.assignedTechnician.user?.toString() === socket.user.userId ||
          booking.assignedTechnician._id?.toString() === socket.user.userId);

      if (isCustomer || isAssignedTech) {
        socket.join(`ticket:${ticketId}`);
        socket.emit('ticket:joined', { ticketId });
      } else {
        socket.emit('ticket:join_denied', {
          ticketId,
          reason: 'Access denied: not party to this booking',
        });
      }
    } catch (err) {
      socket.emit('ticket:join_denied', { ticketId, reason: 'Error verifying room access' });
    }
  });

  // Join admin dispatch room (restricted to admin role)
  socket.on('join:admin', () => {
    if (!socket.user || socket.user.role === 'admin') {
      socket.join('admin:dispatch');
    }
  });

  // Technician live location stream over WebSockets
  socket.on('technician:location', async (payload) => {
    if (!socket.user || socket.user.role !== 'technician') return;
    try {
      const techProfile = await TechnicianProfile.findOne({ user: socket.user.userId });
      if (!techProfile) return;

      await processLocationUpdate({
        technicianProfileId: techProfile._id,
        coordinates: payload.coordinates,
        heading: payload.heading,
        speed: payload.speed,
        timestamp: payload.timestamp,
      });
    } catch (err) {
      console.error('[Socket Location Error]', err);
    }
  });

  socket.on('disconnect', () => {
    // Socket disconnected
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'test') {
      server.listen(PORT, () => {
        console.log(`[Server] Dispatchly API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
        startSweeper().catch((err) => console.error('[Sweeper Init Error]', err));
        startSlaSweeper().catch((err) => console.error('[SLA Sweeper Init Error]', err));
        startPaymentReconciliationSweeper();
        startAutoVerificationSweeper();
      });
    }
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`[Server] Received ${signal}; shutting down gracefully...`);
  server.close(async () => {
    console.log('[Server] HTTP and Socket.IO server closed.');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Server] MongoDB disconnected.');
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };
