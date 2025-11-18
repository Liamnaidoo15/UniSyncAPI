const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/notifications/trigger
 * Trigger notification for storage/message data changes
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const { type, userId, title, body, data } = req.body;

    if (!type || !userId || !title || !body) {
      return res.status(400).json(errorResponse('Type, userId, title, and body are required'));
    }

    // Get FCM token for user (stored in users collection)
    const db = req.app.get('db');
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const user = userDoc.data();
    const fcmToken = user.fcmToken;

    if (!fcmToken) {
      return res.status(400).json(errorResponse('User does not have FCM token registered'));
    }

    // Send notification via FCM
    const message = {
      token: fcmToken,
      notification: {
        title,
        body
      },
      data: {
        type,
        ...data
      },
      android: {
        priority: 'high'
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`Notification sent to ${userId}: ${response}`);

    res.json(successResponse({
      messageId: response,
      userId,
      type
    }, 'Notification sent successfully'));
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json(errorResponse('Failed to send notification', error.message));
  }
});

/**
 * POST /api/notifications/register-token
 * Register FCM token for user
 */
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json(errorResponse('FCM token is required'));
    }

    const db = req.app.get('db');
    await db.collection('users').doc(userId).update({
      fcmToken,
      fcmTokenUpdatedAt: Date.now()
    });

    res.json(successResponse(null, 'FCM token registered successfully'));
  } catch (error) {
    console.error('Register FCM token error:', error);
    res.status(500).json(errorResponse('Failed to register FCM token', error.message));
  }
});

module.exports = router;

