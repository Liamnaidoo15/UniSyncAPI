const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { triggerNotification } = require('../utils/notifications');

/**
 * GET /api/assignments
 * Get all assignments (optionally filtered by courseId)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { courseId } = req.query;

    let query = db.collection('assignments').orderBy('createdAt', 'desc');

    if (courseId) {
      query = query.where('courseId', '==', courseId);
    }

    const snapshot = await query.get();
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse(assignments));
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json(errorResponse('Failed to get assignments', error.message));
  }
});

/**
 * GET /api/assignments/:id
 * Get assignment by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const assignmentDoc = await db.collection('assignments').doc(id).get();

    if (!assignmentDoc.exists) {
      return res.status(404).json(errorResponse('Assignment not found'));
    }

    const assignment = {
      id: assignmentDoc.id,
      ...assignmentDoc.data()
    };

    res.json(successResponse(assignment));
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json(errorResponse('Failed to get assignment', error.message));
  }
});

/**
 * POST /api/assignments
 * Create assignment (Lecturers, Coordinators, Admins only)
 */
router.post('/', authenticateToken, requireRole('LECTURER', 'PROGRAM_COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { title, description, courseId, courseName, dueDate, maxScore } = req.body;

    if (!title || !description || !courseId || !dueDate) {
      return res.status(400).json(errorResponse('Title, description, courseId, and dueDate are required'));
    }

    const assignmentId = uuidv4();
    const assignment = {
      id: assignmentId,
      title,
      description,
      courseId,
      courseName: courseName || courseId,
      lecturerId: req.user.id,
      lecturerName: req.user.name,
      dueDate: parseInt(dueDate),
      createdAt: Date.now(),
      maxScore: maxScore || 100,
      submissionStatus: 'NOT_SUBMITTED',
      submittedAt: null,
      score: null,
      isSynced: true
    };

    await db.collection('assignments').doc(assignmentId).set(assignment);

    // Trigger notification for students in the course
    await triggerNotification(db, {
      type: 'ASSIGNMENT',
      courseId: courseId,
      title: 'New Assignment',
      body: `${title} - Due: ${new Date(parseInt(dueDate)).toLocaleDateString()}`,
      data: { assignmentId, courseId }
    });

    res.status(201).json(successResponse(assignment, 'Assignment created successfully'));
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json(errorResponse('Failed to create assignment', error.message));
  }
});

/**
 * PUT /api/assignments/:id
 * Update assignment
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const updateData = req.body;

    const assignmentDoc = await db.collection('assignments').doc(id).get();

    if (!assignmentDoc.exists) {
      return res.status(404).json(errorResponse('Assignment not found'));
    }

    const assignment = assignmentDoc.data();

    // Only lecturer, coordinators, or admins can update
    if (assignment.lecturerId !== req.user.id && 
        req.user.role !== 'PROGRAM_COORDINATOR' && 
        req.user.role !== 'ADMIN') {
      return res.status(403).json(errorResponse('You can only update your own assignments'));
    }

    delete updateData.id;
    delete updateData.lecturerId;
    delete updateData.createdAt;

    await db.collection('assignments').doc(id).update(updateData);

    const updatedDoc = await db.collection('assignments').doc(id).get();
    const updated = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    res.json(successResponse(updated, 'Assignment updated successfully'));
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json(errorResponse('Failed to update assignment', error.message));
  }
});

/**
 * PUT /api/assignments/:id/submit
 * Submit assignment (Students only)
 */
router.put('/:id/submit', authenticateToken, requireRole('STUDENT'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const assignmentDoc = await db.collection('assignments').doc(id).get();

    if (!assignmentDoc.exists) {
      return res.status(404).json(errorResponse('Assignment not found'));
    }

    const assignment = assignmentDoc.data();

    // Check if assignment is already submitted
    if (assignment.submissionStatus === 'SUBMITTED' || assignment.submissionStatus === 'GRADED') {
      return res.status(400).json(errorResponse('Assignment already submitted'));
    }

    // Update assignment status
    const updateData = {
      submissionStatus: 'SUBMITTED',
      submittedAt: Date.now(),
      studentId: req.user.id
    };

    await db.collection('assignments').doc(id).update(updateData);

    const updatedDoc = await db.collection('assignments').doc(id).get();
    const updated = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    res.json(successResponse(updated, 'Assignment submitted successfully'));
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json(errorResponse('Failed to submit assignment', error.message));
  }
});

module.exports = router;

