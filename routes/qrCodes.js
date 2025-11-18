const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/qr-codes/generate
 * Generate QR code for attendance (Lecturers only)
 */
router.post('/generate', authenticateToken, requireRole('LECTURER', 'PROGRAM_COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { courseId, lecturerId, classDate, durationMinutes } = req.body;

    if (!courseId || !classDate) {
      return res.status(400).json(errorResponse('courseId and classDate are required'));
    }

    const qrCodeId = uuidv4();
    const qrData = `${courseId}_${lecturerId || req.user.id}_${classDate}_${qrCodeId}`;
    const expiresAt = parseInt(classDate) + (durationMinutes || 15) * 60 * 1000;

    const qrCode = {
      id: qrCodeId,
      courseId,
      lecturerId: lecturerId || req.user.id,
      classDate: parseInt(classDate),
      qrData,
      expiresAt,
      isActive: true,
      createdAt: Date.now(),
      isSynced: true
    };

    await db.collection('qrCodes').doc(qrCodeId).set(qrCode);

    res.status(201).json(successResponse(qrCode, 'QR code generated successfully'));
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json(errorResponse('Failed to generate QR code', error.message));
  }
});

/**
 * POST /api/qr-codes/scan
 * Scan QR code for attendance (Students only)
 */
router.post('/scan', authenticateToken, requireRole('STUDENT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { qrData, studentId, latitude, longitude } = req.body;

    if (!qrData || !studentId) {
      return res.status(400).json(errorResponse('qrData and studentId are required'));
    }

    // Parse QR data: courseId_lecturerId_classDate_qrCodeId
    const parts = qrData.split('_');
    if (parts.length < 4) {
      return res.status(400).json(errorResponse('Invalid QR code format'));
    }

    const [courseId, lecturerId, classDateStr, qrCodeId] = parts;
    const classDate = parseInt(classDateStr);

    // Verify QR code exists and is valid
    const qrCodeDoc = await db.collection('qrCodes').doc(qrCodeId).get();

    if (!qrCodeDoc.exists) {
      return res.status(404).json(errorResponse('Invalid QR code'));
    }

    const qrCode = qrCodeDoc.data();

    if (!qrCode.isActive || qrCode.expiresAt < Date.now()) {
      return res.status(400).json(errorResponse('QR code has expired'));
    }

    // Check if attendance already marked
    const existingAttendance = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .where('classDate', '==', classDate)
      .limit(1)
      .get();

    if (!existingAttendance.empty) {
      return res.status(400).json(errorResponse('Attendance already marked for this class'));
    }

    // Create attendance record
    const attendanceId = uuidv4();
    const attendance = {
      id: attendanceId,
      studentId,
      lecturerId,
      courseId,
      classDate,
      status: 'PRESENT',
      markedAt: Date.now(),
      latitude: latitude || null,
      longitude: longitude || null,
      isSynced: true
    };

    await db.collection('attendance').doc(attendanceId).set(attendance);

    res.status(201).json(successResponse(attendance, 'Attendance marked successfully'));
  } catch (error) {
    console.error('Scan QR code error:', error);
    res.status(500).json(errorResponse('Failed to scan QR code', error.message));
  }
});

module.exports = router;

