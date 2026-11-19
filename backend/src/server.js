const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const { connectDB, getDBStatus } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Routes
const complaintRoutes = require('./routes/complaintRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const syncRoutes = require('./routes/syncRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');
const DataStore = require('./models/dataStore');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Static uploads directory (for previewing complaint images)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Social Spork Complaint & WhatsApp Automation API',
    database: getDBStatus(),
    whatsappMode: config.WHATSAPP.MODE
  });
});

// API Routes
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/auth', authRoutes);

// Serve frontend production build if available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handler
app.use(errorHandler);

// Seed initial demo restaurant data if empty
const seedInitialData = async () => {
  try {
    const count = await DataStore.findRestaurants({});
    if (count.length === 0) {
      console.log('[Seed] Seeding initial sample restaurants for Social Spork...');
      await DataStore.createRestaurant({
        name: 'Sidewok Asian Diner',
        sRid: '12345',
        zRid: '18492011',
        subzone: 'Indiranagar',
        city: 'Bengaluru',
        whatsAppNumber: '+919876543210',
        whatsAppContactName: 'Rajesh Kumar (Manager)',
        isActive: true,
        syncSource: 'MANUAL',
        notes: 'Flagship store - Asian cuisine'
      });

      await DataStore.createRestaurant({
        name: 'The Burger Club',
        sRid: '67890',
        zRid: '19203948',
        subzone: 'Koramangala',
        city: 'Bengaluru',
        whatsAppNumber: '+919812345678',
        whatsAppContactName: 'Anil Sharma (Manager)',
        isActive: true,
        syncSource: 'MANUAL',
        notes: 'Burgers & Shakes'
      });

      await DataStore.createRestaurant({
        name: 'Pizza Di Roma',
        sRid: '54321',
        zRid: '20394857',
        subzone: 'Bandra West',
        city: 'Mumbai',
        whatsAppNumber: '+919898765432',
        whatsAppContactName: 'Priya Mehta',
        isActive: true,
        syncSource: 'MANUAL',
        notes: 'Wood-fired Pizza'
      });

      await DataStore.createRestaurant({
        name: 'Royal Biryani House',
        sRid: '98765',
        zRid: '31425364',
        subzone: 'Madhapur',
        city: 'Hyderabad',
        whatsAppNumber: '+919765432109',
        whatsAppContactName: 'Mohammed Tariq',
        isActive: true,
        syncSource: 'MANUAL',
        notes: 'Biryani & Kebabs'
      });

      // Sample initial complaint to demonstrate Sidewok scenario
      await DataStore.createComplaint({
        dedupKey: 'sample_swiggy_12345_987654_initial',
        platform: 'SWIGGY',
        platformRestaurantId: '12345',
        restaurantName: 'Sidewok Asian Diner',
        orderId: '987654',
        complaintEventId: 'SW-EVT-9021',
        category: 'Bad Quality Food',
        issue: 'Contaminated / Expired Food',
        productName: 'Regular Mix Sweets (1kg)',
        customerDescription: 'Customer reported expired sweets with mold and pungent smell.',
        imageUrls: [
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop'
        ],
        platformCreatedAt: new Date(),
        ingestedAt: new Date(),
        processingStatus: 'DELIVERED',
        retryCount: 0
      });

      console.log('[Seed] Sample data seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed Error]', err.message);
  }
};

// Start Server
const startServer = async () => {
  await connectDB();
  await seedInitialData();
  await authController.seedInitialAdmin();

  app.listen(config.PORT, () => {
    console.log(`=======================================================`);
    console.log(`Social Spork Backend Running on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`WhatsApp Mode: ${config.WHATSAPP.MODE.toUpperCase()}`);
    console.log(`Ingestion Endpoint: http://localhost:${config.PORT}/api/v1/complaints/ingest`);
    console.log(`=======================================================`);
  });
};

startServer();

module.exports = app;
