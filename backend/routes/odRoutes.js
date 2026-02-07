import express from 'express';
import {
  submitODRequest,
  getODRequestsForTeacher,
  approveODRequest,
  rejectODRequest,
  verifyAttendance,
  getMyODRequests,
  getODRequestDetails
} from '../controllers/odController.js';
import { verifyToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.post('/', verifyToken, authorizeRole('STUDENT'), submitODRequest);
router.get('/my-requests', verifyToken, authorizeRole('STUDENT'), getMyODRequests);

// Teacher routes
router.get('/teacher/requests', verifyToken, authorizeRole('TEACHER'), getODRequestsForTeacher);
router.put('/:odRequestId/approve', verifyToken, authorizeRole('TEACHER'), approveODRequest);
router.put('/:odRequestId/reject', verifyToken, authorizeRole('TEACHER'), rejectODRequest);

// Event coordinator routes
router.post('/verify-attendance', verifyToken, authorizeRole('EVENT_COORDINATOR', 'ADMIN'), verifyAttendance);

// General routes
router.get('/:id', verifyToken, getODRequestDetails);

export default router;
