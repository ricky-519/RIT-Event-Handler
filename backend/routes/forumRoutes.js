import express from 'express';
import {
  createForumPost,
  getForumPosts,
  addComment,
  toggleLike,
  deleteForumPost
} from '../controllers/forumController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.post('/', verifyToken, createForumPost);
router.get('/:eventId', verifyToken, getForumPosts);
router.post('/:postId/comments', verifyToken, addComment);
router.put('/:postId/like', verifyToken, toggleLike);
router.delete('/:postId', verifyToken, deleteForumPost);

export default router;
