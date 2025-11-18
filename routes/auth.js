const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    console.log('=== Registration Request Received ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const db = req.app.get('db');
    
    // Check if db is available
    if (!db) {
      console.error('❌ Database not available - Firebase Admin may not be initialized');
      return res.status(500).json(errorResponse('Database connection not available. Please check server configuration.'));
    }
    
    console.log('✅ Database connection available');
    
    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json(errorResponse('Server configuration error: JWT_SECRET not set'));
    }
    
    console.log('✅ JWT_SECRET is configured');
    
    // Extract fields from request (supports RegisterRequest format)
    const { email, name, role, password, studentId, lecturerId, coordinatorId } = req.body;

    console.log(`Registration attempt for email: ${email}, role: ${role}, has password: ${!!password}`);

    // Validation
    if (!email || !name || !role) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json(errorResponse('Email, name, and role are required'));
    }

    if (!password) {
      console.log('Registration failed: Password is required');
      return res.status(400).json(errorResponse('Password is required'));
    }

    // Check if user already exists
    console.log('Checking if user already exists...');
    try {
      const existingUser = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        console.log(`Registration failed: User already exists for email: ${email}`);
        return res.status(400).json(errorResponse('User with this email already exists'));
      }
      console.log('✅ User does not exist, proceeding with registration');
    } catch (queryError) {
      console.error('❌ Error checking existing user:', queryError);
      throw new Error(`Failed to check existing user: ${queryError.message}`);
    }

    // Hash password
    console.log('Hashing password...');
    if (!password || password.length < 6) {
      console.log('Registration failed: Password too short');
      return res.status(400).json(errorResponse('Password must be at least 6 characters'));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      email,
      name,
      role: role.toUpperCase(),
      studentId: studentId || null,
      lecturerId: lecturerId || null,
      coordinatorId: coordinatorId || null,
      profileImageUrl: null,
      createdAt: Date.now(),
      lastSyncTime: Date.now(),
      isSynced: true,
      password: hashedPassword // Store hashed password
    };

    // Save to Firestore
    console.log(`Saving user to Firestore: ${userId}`);
    try {
      await db.collection('users').doc(userId).set(user);
      console.log(`✅ User saved successfully to Firestore: ${userId}`);
    } catch (firestoreError) {
      console.error('❌ Error saving user to Firestore:', firestoreError);
      console.error('Firestore error code:', firestoreError.code);
      console.error('Firestore error message:', firestoreError.message);
      throw new Error(`Failed to save user to Firestore: ${firestoreError.message}`);
    }

    // Verify the user was saved with password
    const savedUserDoc = await db.collection('users').doc(userId).get();
    const savedUser = savedUserDoc.data();
    console.log(`Verification: User saved with password: ${!!savedUser.password}`);

    // Remove password from response
    delete user.password;

    // Generate JWT token
    console.log('Generating JWT token...');
    let token;
    try {
      token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ JWT token generated successfully');
    } catch (jwtError) {
      console.error('❌ Error generating JWT token:', jwtError);
      throw new Error(`Failed to generate authentication token: ${jwtError.message}`);
    }

    console.log(`✅ Registration successful for user: ${email}`);
    // Return just the user (matching ApiResponse<User> format expected by Android app)
    res.status(201).json(successResponse(user, 'User registered successfully'));
  } catch (error) {
    console.error('❌ ========== REGISTRATION ERROR ==========');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('===========================================');
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to register user';
    if (error.message && error.message.includes('Firebase')) {
      errorMessage = 'Database connection error. Please check server configuration.';
    } else if (error.message && error.message.includes('JWT')) {
      errorMessage = 'Authentication service error. Please check server configuration.';
    }
    
    res.status(500).json(errorResponse(errorMessage, 'Failed to register user'));
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Login attempt: Missing email or password');
      return res.status(400).json(errorResponse('Email and password are required'));
    }

    console.log(`Login attempt for email: ${email}`);

    // Find user by email
    const userQuery = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.log(`Login failed: User not found for email: ${email}`);
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    const userDoc = userQuery.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    // Check password - handle users without passwords (created before password requirement)
    if (!user.password) {
      console.log(`Login failed: No password stored for user: ${email}`);
      console.log(`User data keys: ${Object.keys(user).join(', ')}`);
      // For users created before password requirement, we can't authenticate them
      // They need to reset their password or register again
      return res.status(401).json(errorResponse('No password set for this account. Please use "Forgot Password" or contact support to set a password.'));
    }

    console.log(`Checking password for user: ${email}, has password: ${!!user.password}, password length: ${user.password.length}`);
    
    // Check if password is bcrypt hashed (starts with $2a$, $2b$, or $2y$)
    const isBcryptHash = user.password.startsWith('$2a$') || 
                         user.password.startsWith('$2b$') || 
                         user.password.startsWith('$2y$');
    
    let isValidPassword = false;
    
    if (isBcryptHash) {
      // Password is bcrypt hashed, compare normally
      console.log(`Password is bcrypt hashed, comparing...`);
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log(`Bcrypt password comparison result: ${isValidPassword}`);
    } else {
      // Password might be stored in plain text (for backward compatibility with old accounts)
      // This is less secure but allows migration of old accounts
      console.log(`Warning: Password appears to be stored in plain text for user: ${email}`);
      console.log(`This is insecure. User should reset password.`);
      isValidPassword = (password === user.password);
      console.log(`Plain text password comparison result: ${isValidPassword}`);
      
      // If login succeeds with plain text, hash and update the password
      if (isValidPassword) {
        console.log(`Migrating plain text password to bcrypt for user: ${email}`);
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.collection('users').doc(user.id).update({
            password: hashedPassword
          });
          console.log(`Password migrated to bcrypt for user: ${email}`);
        } catch (migrationError) {
          console.error(`Failed to migrate password for user: ${email}`, migrationError);
          // Continue with login even if migration fails
        }
      }
    }
    
    if (!isValidPassword) {
      console.log(`Login failed: Invalid password for user: ${email}`);
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    console.log(`Login successful for user: ${email}`);

    // Remove password from response
    delete user.password;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json(successResponse({
      user,
      token
    }, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(errorResponse('Failed to login', error.message));
  }
});

/**
 * POST /api/auth/sso
 * SSO authentication (Google Sign-In)
 */
router.post('/sso', async (req, res) => {
  try {
    const db = req.app.get('db');
    const admin = require('firebase-admin');
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json(errorResponse('ID token is required'));
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // Check if user exists in Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    let user;
    if (!userDoc.exists) {
      // Create new user from SSO
      user = {
        id: uid,
        email: email || '',
        name: name || '',
        role: 'STUDENT', // Default role for SSO users
        profileImageUrl: decodedToken.picture || null,
        createdAt: Date.now(),
        lastSyncTime: Date.now(),
        isSynced: true
      };
      await db.collection('users').doc(uid).set(user);
      console.log(`SSO user created: ${email}`);
    } else {
      user = { id: userDoc.id, ...userDoc.data() };
      delete user.password;
      
      // Update last sync time
      await db.collection('users').doc(uid).update({
        lastSyncTime: Date.now()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json(successResponse({
      user,
      token
    }, 'SSO login successful'));
  } catch (error) {
    console.error('SSO error:', error);
    res.status(401).json(errorResponse('Invalid ID token', error.message));
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userDoc = await db.collection('users').doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const user = { id: userDoc.id, ...userDoc.data() };
    delete user.password; // Remove password

    res.json(successResponse(user));
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json(errorResponse('Failed to get user', error.message));
  }
});

module.exports = router;

