import ODRequest from '../models/ODRequest.js';
import { generateUniqueCode, generateQRCode } from '../utils/helpers.js';
import Event from '../models/Event.js';

// Submit OD request
export const submitODRequest = async (req, res) => {
  try {
    const { eventId, teacherId, reason } = req.body;

    const odRequest = new ODRequest({
      student: req.user.userId,
      event: eventId,
      teacher: teacherId,
      reason,
    });

    await odRequest.save();

    res.status(201).json({
      message: 'OD request submitted successfully',
      odRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all OD requests for teacher
export const getODRequestsForTeacher = async (req, res) => {
  try {
    const odRequests = await ODRequest.find({ teacher: req.user.userId })
      .populate('student', 'name email registrationNumber')
      .populate('event', 'title date')
      .sort({ createdAt: -1 });

    res.json({ odRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve OD request
export const approveODRequest = async (req, res) => {
  try {
    const { odRequestId } = req.params;

    const odRequest = await ODRequest.findById(odRequestId);

    if (!odRequest) {
      return res.status(404).json({ message: 'OD request not found' });
    }

    if (odRequest.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to approve this OD' });
    }

    // Generate unique code and QR code
    const uniqueCode = generateUniqueCode();
    const qrData = `OD-${odRequest._id}-${uniqueCode}`;
    const qrCode = await generateQRCode(qrData);

    odRequest.status = 'APPROVED';
    odRequest.uniqueCode = uniqueCode;
    odRequest.qrCode = qrCode;
    odRequest.approvedAt = new Date();

    await odRequest.save();

    res.json({
      message: 'OD request approved successfully',
      odRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject OD request
export const rejectODRequest = async (req, res) => {
  try {
    const { odRequestId } = req.params;
    const { reason } = req.body;

    const odRequest = await ODRequest.findById(odRequestId);

    if (!odRequest) {
      return res.status(404).json({ message: 'OD request not found' });
    }

    if (odRequest.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to reject this OD' });
    }

    odRequest.status = 'REJECTED';
    odRequest.rejectedReason = reason;
    odRequest.rejectedAt = new Date();

    await odRequest.save();

    res.json({
      message: 'OD request rejected successfully',
      odRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify attendance via QR or code
export const verifyAttendance = async (req, res) => {
  try {
    const { code } = req.body; // Can be QR data or unique code

    let odRequest;

    if (code.startsWith('OD-')) {
      // QR code format
      const parts = code.split('-');
      odRequest = await ODRequest.findById(parts[1]);

      if (!odRequest || odRequest.uniqueCode !== parts[2]) {
        return res.status(404).json({ message: 'Invalid QR code' });
      }
    } else {
      // Direct unique code
      odRequest = await ODRequest.findOne({ uniqueCode: code });

      if (!odRequest) {
        return res.status(404).json({ message: 'Invalid code' });
      }
    }

    if (odRequest.status !== 'APPROVED') {
      return res.status(400).json({ message: 'OD not approved' });
    }

    odRequest.attendanceVerified = true;
    odRequest.verifiedBy = req.user.userId;
    odRequest.verifiedAt = new Date();

    await odRequest.save();

    res.json({
      message: 'Attendance verified successfully',
      odRequest: {
        student: odRequest.student,
        event: odRequest.event,
        status: odRequest.status,
        verifiedAt: odRequest.verifiedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's OD requests
export const getMyODRequests = async (req, res) => {
  try {
    const odRequests = await ODRequest.find({ student: req.user.userId })
      .populate('event', 'title date')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    res.json({ odRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get OD request details
export const getODRequestDetails = async (req, res) => {
  try {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate('student', 'name email registrationNumber')
      .populate('event', 'title date location')
      .populate('teacher', 'name email')
      .populate('verifiedBy', 'name email');

    if (!odRequest) {
      return res.status(404).json({ message: 'OD request not found' });
    }

    res.json({ odRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
