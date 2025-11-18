const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { triggerNotification } = require('../utils/notifications');

/**
 * GET /api/announcements
 * Get all announcements (optionally filtered by courseId)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { courseId } = req.query;

    let query = db.collection('announcements').orderBy('createdAt', 'desc');

    if (courseId) {
      query = query.where('courseId', '==', courseId);
    }

    const snapshot = await query.get();
    const announcements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse(announcements));
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json(errorResponse('Failed to get announcements', error.message));
  }
});

/**
 * GET /api/announcements/:id
 * Get announcement by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const announcementDoc = await db.collection('announcements').doc(id).get();

    if (!announcementDoc.exists) {
      return res.status(404).json(errorResponse('Announcement not found'));
    }

    const announcement = {
      id: announcementDoc.id,
      ...announcementDoc.data()
    };

    res.json(successResponse(announcement));
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json(errorResponse('Failed to get announcement', error.message));
  }
});

/**
 * POST /api/announcements
 * Create announcement (Lecturers, Coordinators, Admins only)
 */
router.post('/', authenticateToken, requireRole('LECTURER', 'PROGRAM_COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { title, content, courseId, courseName, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json(errorResponse('Title and content are required'));
    }

    const announcementId = uuidv4();
    const announcement = {
      id: announcementId,
      title,
      content,
      authorId: req.user.id,
      authorName: req.user.name,
      courseId: courseId || null,
      courseName: courseName || null,
      priority: priority || 'NORMAL',
      createdAt: Date.now(),
      isRead: false,
      isSynced: true
    };

    await db.collection('announcements').doc(announcementId).set(announcement);

    // Trigger notification for relevant users
    await triggerNotification(db, {
      type: 'ANNOUNCEMENT',
      courseId: courseId,
      title: 'New Announcement',
      body: `${title} - ${courseName || 'General'}`,
      data: { announcementId, courseId }
    });

    res.status(201).json(successResponse(announcement, 'Announcement created successfully'));
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json(errorResponse('Failed to create announcement', error.message));
  }
});

/**
 * PUT /api/announcements/:id
 * Update announcement
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const updateData = req.body;

    const announcementDoc = await db.collection('announcements').doc(id).get();

    if (!announcementDoc.exists) {
      return res.status(404).json(errorResponse('Announcement not found'));
    }

    const announcement = announcementDoc.data();

    // Only author, coordinators, or admins can update
    if (announcement.authorId !== req.user.id && 
        req.user.role !== 'PROGRAM_COORDINATOR' && 
        req.user.role !== 'ADMIN') {
      return res.status(403).json(errorResponse('You can only update your own announcements'));
    }

    delete updateData.id; // Don't allow changing ID
    delete updateData.authorId; // Don't allow changing author
    delete updateData.createdAt; // Don't allow changing creation date

    await db.collection('announcements').doc(id).update(updateData);

    const updatedDoc = await db.collection('announcements').doc(id).get();
    const updated = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    res.json(successResponse(updated, 'Announcement updated successfully'));
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json(errorResponse('Failed to update announcement', error.message));
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete announcement
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const announcementDoc = await db.collection('announcements').doc(id).get();

    if (!announcementDoc.exists) {
      return res.status(404).json(errorResponse('Announcement not found'));
    }

    const announcement = announcementDoc.data();

    // Only author, coordinators, or admins can delete
    if (announcement.authorId !== req.user.id && 
        req.user.role !== 'PROGRAM_COORDINATOR' && 
        req.user.role !== 'ADMIN') {
      return res.status(403).json(errorResponse('You can only delete your own announcements'));
    }

    await db.collection('announcements').doc(id).delete();

    res.json(successResponse(null, 'Announcement deleted successfully'));
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json(errorResponse('Failed to delete announcement', error.message));
  }
});

module.exports = router;

