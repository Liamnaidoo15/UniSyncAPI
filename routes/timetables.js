const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/timetables
 * Get timetables (optionally filtered by dayOfWeek)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { dayOfWeek } = req.query;

    let query = db.collection('timetables').orderBy('dayOfWeek', 'asc').orderBy('startTime', 'asc');

    if (dayOfWeek) {
      query = query.where('dayOfWeek', '==', parseInt(dayOfWeek));
    }

    const snapshot = await query.get();
    const timetables = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse(timetables));
  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json(errorResponse('Failed to get timetables', error.message));
  }
});

/**
 * POST /api/timetables
 * Create timetable (Lecturers, Coordinators, Admins only)
 */
router.post('/', authenticateToken, requireRole('LECTURER', 'PROGRAM_COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { courseId, courseName, lecturerId, lecturerName, dayOfWeek, startTime, endTime, venue, roomNumber } = req.body;

    if (!courseId || !courseName || !dayOfWeek || !startTime || !endTime || !venue) {
      return res.status(400).json(errorResponse('courseId, courseName, dayOfWeek, startTime, endTime, and venue are required'));
    }

    const timetableId = uuidv4();
    const timetable = {
      id: timetableId,
      courseId,
      courseName,
      lecturerId: lecturerId || req.user.id,
      lecturerName: lecturerName || req.user.name,
      dayOfWeek: parseInt(dayOfWeek),
      startTime,
      endTime,
      venue,
      roomNumber: roomNumber || null,
      isSynced: true
    };

    await db.collection('timetables').doc(timetableId).set(timetable);

    res.status(201).json(successResponse(timetable, 'Timetable created successfully'));
  } catch (error) {
    console.error('Create timetable error:', error);
    res.status(500).json(errorResponse('Failed to create timetable', error.message));
  }
});

module.exports = router;

