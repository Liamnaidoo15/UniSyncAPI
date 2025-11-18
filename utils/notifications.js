/**
 * Helper function to trigger notifications
 */
async function triggerNotification(db, { type, courseId, title, body, data }) {
  try {
    // Get all users who should receive this notification
    let userIds = [];

    if (courseId) {
      // Get students enrolled in the course
      const studentsQuery = await db.collection('users')
        .where('role', '==', 'STUDENT')
        .get();
      
      // In a real implementation, you'd check course enrollment
      // For now, we'll notify all students
      userIds = studentsQuery.docs.map(doc => doc.id);
    } else {
      // Notify all users
      const usersQuery = await db.collection('users').get();
      userIds = usersQuery.docs.map(doc => doc.id);
    }

    // Send notifications (in production, use a queue system)
    const admin = require('firebase-admin');
    const notifications = userIds.map(async (userId) => {
      const userDoc = await db.collection('users').doc(userId).get();
      const fcmToken = userDoc.exists ? userDoc.data().fcmToken : null;

      if (fcmToken) {
        try {
          await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: { type, ...data },
            android: { priority: 'high' }
          });
        } catch (error) {
          console.error(`Failed to send notification to ${userId}:`, error);
        }
      }
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error triggering notifications:', error);
    // Don't fail the main request if notification fails
  }
}

module.exports = { triggerNotification };

