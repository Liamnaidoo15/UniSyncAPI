const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/sync/pending
 * Sync pending offline operations
 */
router.post('/pending', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { operations } = req.body; // Array of sync operations

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json(errorResponse('Operations array is required'));
    }

    const results = [];
    const errors = [];

    for (const op of operations) {
      try {
        const { operation, entityType, entityId, entityData } = op;

        switch (operation) {
          case 'CREATE':
            await handleCreate(db, entityType, entityId, entityData);
            results.push({ operation, entityType, entityId, status: 'success' });
            break;
          case 'UPDATE':
            await handleUpdate(db, entityType, entityId, entityData);
            results.push({ operation, entityType, entityId, status: 'success' });
            break;
          case 'DELETE':
            await handleDelete(db, entityType, entityId);
            results.push({ operation, entityType, entityId, status: 'success' });
            break;
          default:
            errors.push({ operation, entityType, entityId, error: 'Unknown operation' });
        }
      } catch (error) {
        errors.push({ 
          operation: op.operation, 
          entityType: op.entityType, 
          entityId: op.entityId, 
          error: error.message 
        });
      }
    }

    res.json(successResponse({
      synced: results.length,
      failed: errors.length,
      results,
      errors
    }, `Synced ${results.length} operations`));
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json(errorResponse('Failed to sync operations', error.message));
  }
});

/**
 * GET /api/sync/status
 * Get sync status for user
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.id;

    // Get last sync time from user document
    const userDoc = await db.collection('users').doc(userId).get();
    const lastSyncTime = userDoc.exists ? (userDoc.data().lastSyncTime || 0) : 0;

    res.json(successResponse({
      userId,
      lastSyncTime,
      isOnline: true
    }));
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json(errorResponse('Failed to get sync status', error.message));
  }
});

// Helper functions
async function handleCreate(db, entityType, entityId, entityData) {
  const collection = getCollectionName(entityType);
  const data = { ...entityData, id: entityId, isSynced: true, lastSyncTime: Date.now() };
  await db.collection(collection).doc(entityId).set(data);
}

async function handleUpdate(db, entityType, entityId, entityData) {
  const collection = getCollectionName(entityType);
  const data = { ...entityData, isSynced: true, lastSyncTime: Date.now() };
  delete data.id; // Don't update ID
  await db.collection(collection).doc(entityId).update(data);
}

async function handleDelete(db, entityType, entityId) {
  const collection = getCollectionName(entityType);
  await db.collection(collection).doc(entityId).delete();
}

function getCollectionName(entityType) {
  const mapping = {
    'Announcement': 'announcements',
    'Assignment': 'assignments',
    'Attendance': 'attendance',
    'Timetable': 'timetables',
    'NetworkPost': 'networkPosts',
    'Message': 'messages'
  };
  return mapping[entityType] || entityType.toLowerCase() + 's';
}

module.exports = router;

