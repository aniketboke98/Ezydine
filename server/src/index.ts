import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscription';
import tablesRoutes from './routes/tables';
import menuRoutes from './routes/menu';
import billsRoutes from './routes/bills';
import kotRoutes from './routes/kot';
import inventoryRoutes from './routes/inventory';
import reportsRoutes from './routes/reports';
import restaurantRoutes from './routes/restaurant';
import staffRoutes from './routes/staff';
import masterRoutes from './routes/master';
import printRoutes from './routes/print';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EzyDine Backend API',
    database: 'PostgreSQL 18 connected',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/kot', kotRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/print', printRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 EzyDine Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to PostgreSQL database: ezydine_db`);
});
