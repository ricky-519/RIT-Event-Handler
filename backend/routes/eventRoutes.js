import express from 'express';
import { 
  createEvent, 
  getAllEvents, 
  getEventById, 
  registerForEvent, 
  getMyEvents,
  updateEvent,
  deleteEvent 
} from '../controllers/eventController.js';
import { verifyToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Protected routes
router.post('/', verifyToken, authorizeRole('CLUB_ADMIN', 'ADMIN'), createEvent);
router.post('/register/:id', verifyToken, registerForEvent);
router.get('/user/my-events', verifyToken, getMyEvents);
router.put('/:id', verifyToken, updateEvent);
router.delete('/:id', verifyToken, deleteEvent);

export default router;
