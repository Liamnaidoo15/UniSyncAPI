const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set in .env file');
  console.warn('⚠️  Using default secret for development (NOT SECURE FOR PRODUCTION)');
  console.warn('⚠️  Please create a .env file with JWT_SECRET=your-secret-key');
  process.env.JWT_SECRET = 'dev-secret-key-change-in-production-' + Date.now();
}

// Initialize Firebase Admin
let db;
try {
  let serviceAccount;
  
  // Check if Firebase credentials are provided via environment variables (for Render/cloud hosting)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse JSON from environment variable
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('📁 Using Firebase service account from environment variable');
    } catch (parseError) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT environment variable:', parseError.message);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
    }
  } else {
    // Try to find service account key file (for local development)
    const fs = require('fs');
    let serviceAccountPath = './serviceAccountKey.json';
    
    // If serviceAccountKey.json doesn't exist, look for firebase-adminsdk files
    if (!fs.existsSync(serviceAccountPath)) {
      const files = fs.readdirSync('./');
      const firebaseKeyFile = files.find(file => file.includes('firebase-adminsdk') && file.endsWith('.json'));
      if (firebaseKeyFile) {
        serviceAccountPath = './' + firebaseKeyFile;
        console.log(`📁 Using Firebase service account: ${firebaseKeyFile}`);
      }
    }
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account file not found: ${serviceAccountPath}`);
    }
    
    serviceAccount = require(serviceAccountPath);
    console.log(`📁 Using Firebase service account from file: ${serviceAccountPath}`);
  }
  
  // Validate service account structure
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Invalid service account: missing required fields (project_id, private_key, or client_email)');
  }
  
  console.log(`📋 Service account project: ${serviceAccount.project_id}`);
  console.log(`📧 Service account email: ${serviceAccount.client_email}`);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  db = admin.firestore();
  
  // Test Firestore connection (async, non-blocking)
  console.log('🔍 Testing Firestore connection...');
  db.collection('_test_connection').limit(1).get()
    .then(() => {
      console.log('✅ Firebase Admin initialized and Firestore connection verified');
    })
    .catch((testError) => {
      console.error('❌ Firestore connection test failed:', testError.message);
      console.error('Error code:', testError.code);
      if (testError.code === 16) {
        console.error('⚠️  UNAUTHENTICATED error - Service account may not have proper permissions');
        console.error('⚠️  Check that:');
        console.error('   1. Service account is enabled in Google Cloud Console');
        console.error('   2. Service account has "Firebase Admin SDK Administrator Service Agent" role');
        console.error('   3. Firestore is enabled in Firebase Console');
        console.error('   4. Service account key is not expired or revoked');
        console.error('   5. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts');
        console.error(`   6. Find service account: ${serviceAccount.client_email}`);
        console.error('   7. Ensure it has proper Firebase/Firestore permissions');
      }
      console.log('⚠️  Continuing despite connection test failure - operations may fail');
    });
  
  console.log('✅ Firebase Admin initialized (connection test running in background)');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('Error stack:', error.stack);
  console.log('⚠️  For local development: Make sure serviceAccountKey.json or firebase-adminsdk-*.json exists');
  console.log('⚠️  For cloud hosting (Render): Set FIREBASE_SERVICE_ACCOUNT environment variable with JSON content');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const announcementRoutes = require('./routes/announcements');
const assignmentRoutes = require('./routes/assignments');
const attendanceRoutes = require('./routes/attendance');
const timetableRoutes = require('./routes/timetables');
const qrCodeRoutes = require('./routes/qrCodes');
const networkRoutes = require('./routes/network');
const syncRoutes = require('./routes/sync');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow all origins in development, configure for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins in dev, set specific origin in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make db available to routes
app.set('db', db);

// Health check endpoint
app.get('/health', (req, res) => {
  const db = app.get('db');
  const hasDb = !!db;
  const hasJwtSecret = !!process.env.JWT_SECRET;
  const hasFirebaseConfig = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  
  res.json({ 
    success: true, 
    message: 'UniSync API is running',
    timestamp: new Date().toISOString(),
    configuration: {
      database: hasDb ? 'connected' : 'not connected',
      jwtSecret: hasJwtSecret ? 'configured' : 'not configured',
      firebaseConfig: hasFirebaseConfig ? 'from environment' : 'from file'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UniSync API server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ NOT SET'}`);
  console.log(`🔥 Firebase: ${db ? '✅ Connected' : '❌ NOT CONNECTED'}`);
  console.log(`📁 Firebase Config: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'From Environment' : 'From File'}`);
});

module.exports = app;

