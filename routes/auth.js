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
    const db = req.app.get('db');
    
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
    const existingUser = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      console.log(`Registration failed: User already exists for email: ${email}`);
      return res.status(400).json(errorResponse('User with this email already exists'));
    }

    // Hash password
    console.log('Hashing password...');
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
    await db.collection('users').doc(userId).set(user);
    console.log(`User saved successfully to Firestore: ${userId}`);

    // Verify the user was saved with password
    const savedUserDoc = await db.collection('users').doc(userId).get();
    const savedUser = savedUserDoc.data();
    console.log(`Verification: User saved with password: ${!!savedUser.password}`);

    // Remove password from response
    delete user.password;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`Registration successful for user: ${email}`);
    res.status(201).json(successResponse(user, 'User registered successfully'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(errorResponse('Failed to register user', error.message));
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

    // Check password
    if (!user.password) {
      console.log(`Login failed: No password stored for user: ${email}`);
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    console.log(`Checking password for user: ${email}, has password: ${!!user.password}`);
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(`Password comparison result: ${isValidPassword}`);
    
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

