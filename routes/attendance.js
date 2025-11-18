const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/attendance
 * Get attendance records (optionally filtered by studentId or courseId)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { studentId, courseId } = req.query;

    let query = db.collection('attendance').orderBy('markedAt', 'desc');

    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }
    if (courseId) {
      query = query.where('courseId', '==', courseId);
    }

    const snapshot = await query.get();
    const attendance = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse(attendance));
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json(errorResponse('Failed to get attendance', error.message));
  }
});

/**
 * POST /api/attendance
 * Mark attendance (Lecturers, Coordinators, Admins only)
 */
router.post('/', authenticateToken, requireRole('LECTURER', 'PROGRAM_COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { studentId, courseId, classDate, status } = req.body;

    if (!studentId || !courseId || !classDate || !status) {
      return res.status(400).json(errorResponse('studentId, courseId, classDate, and status are required'));
    }

    const attendanceId = uuidv4();
    const attendance = {
      id: attendanceId,
      studentId,
      lecturerId: req.user.id,
      courseId,
      classDate: parseInt(classDate),
      status: status.toUpperCase(),
      markedAt: Date.now(),
      isSynced: true
    };

    await db.collection('attendance').doc(attendanceId).set(attendance);

    res.status(201).json(successResponse(attendance, 'Attendance marked successfully'));
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json(errorResponse('Failed to mark attendance', error.message));
  }
});

/**
 * GET /api/attendance/stats/:studentId/:courseId
 * Get attendance statistics for a student in a course
 */
router.get('/stats/:studentId/:courseId', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { studentId, courseId } = req.params;

    // Get all attendance records for this student and course
    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    const records = snapshot.docs.map(doc => doc.data());
    
    const totalClasses = records.length;
    const presentCount = records.filter(r => r.status === 'PRESENT').length;
    const absentCount = records.filter(r => r.status === 'ABSENT').length;
    const lateCount = records.filter(r => r.status === 'LATE').length;
    const attendancePercentage = totalClasses > 0 
      ? (presentCount / totalClasses) * 100 
      : 0;

    const stats = {
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100
    };

    res.json(successResponse(stats));
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json(errorResponse('Failed to get attendance statistics', error.message));
  }
});

module.exports = router;

