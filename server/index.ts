dotenv.config({ path: '../.env' });
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import routes, { setWebSocketService } from './routes';
import { schedulePriceUpdates } from './price-service';
import { scheduleMonthlyLeaderboardProcessing } from './leaderboard-service';
import { initializeSlotConfigs } from './slot-service';
import { initializeDefaultAssets } from './price-service';
import { evaluateExpiredPredictions } from './prediction-service';
import WebSocketService from './websocket-service';

// Load environment variables


const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Connect WebSocket service to routes
setWebSocketService(wsService);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://natural-pest-production.up.railway.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes - must come before the catch-all route
app.use('/api', routes);

// Serve static files from the React build
app.use(express.static('dist/public'));

// Serve React app for all non-API routes (catch-all route)
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile('dist/public/index.html', { root: '.' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize system on startup
async function initializeSystem() {
  try {
    console.log('Initializing system...');
    
    // Initialize slot configurations
    try {
      await initializeSlotConfigs();
      console.log('Slot configurations initialized');
    } catch (error) {
      console.warn('Slot configurations initialization failed (database may not be available):', error instanceof Error ? error.message : String(error));
    }
    
    // Initialize default assets
    try {
      await initializeDefaultAssets();
      console.log('Default assets initialized');
    } catch (error) {
      console.warn('Default assets initialization failed (database may not be available):', error instanceof Error ? error.message : String(error));
    }
    
    // Schedule background tasks
    schedulePriceUpdates();
    console.log('Price updates scheduled');
    
    scheduleMonthlyLeaderboardProcessing();
    console.log('Monthly leaderboard processing scheduled');
    
    // Schedule prediction evaluation (every 5 minutes)
    setInterval(async () => {
      try {
        await evaluateExpiredPredictions();
      } catch (error) {
        console.error('Prediction evaluation failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    console.log('Prediction evaluation scheduled');
    
    // Schedule slot updates (every minute)
    setInterval(() => {
      wsService.broadcastSlotUpdate('24h');
      wsService.broadcastSlotUpdate('7d');
      wsService.broadcastSlotUpdate('30d');
    }, 60 * 1000); // 1 minute
    console.log('Slot updates scheduled');
    
    console.log('System initialization completed');
  } catch (error) {
    console.error('System initialization failed:', error);
    console.log('Server will continue running but some features may not work until database is available');
  }
}
console.log('Server starting...at ' + PORT);
// Start server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`WebSocket service initialized`);
  
  // Initialize system after server starts
  await initializeSystem();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Export WebSocket service for use in other modules
export { wsService };
