const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/network/posts
 * Get all network posts
 */
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');

    const snapshot = await db.collection('networkPosts')
      .orderBy('createdAt', 'desc')
      .get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse(posts));
  } catch (error) {
    console.error('Get network posts error:', error);
    res.status(500).json(errorResponse('Failed to get network posts', error.message));
  }
});

/**
 * POST /api/network/posts
 * Create network post
 */
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { content, imageUrl } = req.body;

    if (!content) {
      return res.status(400).json(errorResponse('Content is required'));
    }

    const postId = uuidv4();
    const post = {
      id: postId,
      authorId: req.user.id,
      authorName: req.user.name,
      content,
      imageUrl: imageUrl || null,
      likes: [],
      likeCount: 0,
      createdAt: Date.now(),
      isSynced: true
    };

    await db.collection('networkPosts').doc(postId).set(post);

    res.status(201).json(successResponse(post, 'Post created successfully'));
  } catch (error) {
    console.error('Create network post error:', error);
    res.status(500).json(errorResponse('Failed to create post', error.message));
  }
});

/**
 * POST /api/network/posts/:id/like
 * Like/unlike a post
 */
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const userId = req.user.id;

    const postDoc = await db.collection('networkPosts').doc(id).get();

    if (!postDoc.exists) {
      return res.status(404).json(errorResponse('Post not found'));
    }

    const post = postDoc.data();
    const likes = post.likes || [];
    const isLiked = likes.includes(userId);

    if (isLiked) {
      // Unlike
      const updatedLikes = likes.filter(uid => uid !== userId);
      await db.collection('networkPosts').doc(id).update({
        likes: updatedLikes,
        likeCount: updatedLikes.length
      });
    } else {
      // Like
      likes.push(userId);
      await db.collection('networkPosts').doc(id).update({
        likes,
        likeCount: likes.length
      });
    }

    const updatedDoc = await db.collection('networkPosts').doc(id).get();
    const updated = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    res.json(successResponse(updated, isLiked ? 'Post unliked' : 'Post liked'));
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json(errorResponse('Failed to like post', error.message));
  }
});

module.exports = router;

