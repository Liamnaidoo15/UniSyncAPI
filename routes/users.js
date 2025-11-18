const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const user = { id: userDoc.id, ...userDoc.data() };
    delete user.password; // Remove password

    res.json(successResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(errorResponse('Failed to get user', error.message));
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const updateData = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json(errorResponse('You can only update your own profile'));
    }

    // Don't allow updating password through this endpoint
    delete updateData.password;
    delete updateData.id; // Don't allow changing ID

    updateData.lastSyncTime = Date.now();

    await db.collection('users').doc(id).update(updateData);

    const updatedUserDoc = await db.collection('users').doc(id).get();
    const user = { id: updatedUserDoc.id, ...updatedUserDoc.data() };
    delete user.password;

    res.json(successResponse(user, 'User updated successfully'));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(errorResponse('Failed to update user', error.message));
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    // Prevent admins from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json(errorResponse('Cannot delete your own account'));
    }

    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Delete user from Firestore
    await db.collection('users').doc(id).delete();

    console.log(`User deleted by admin ${req.user.id}: ${id}`);
    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(errorResponse('Failed to delete user', error.message));
  }
});

module.exports = router;

