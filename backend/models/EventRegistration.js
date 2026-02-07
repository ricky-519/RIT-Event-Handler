import mongoose from 'mongoose';

const eventRegistrationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  attended: {
    type: Boolean,
    default: false,
  },
  attendanceMarkedAt: {
    type: Date,
  },
});

eventRegistrationSchema.index({ student: 1, event: 1 }, { unique: true });

export default mongoose.model('EventRegistration', eventRegistrationSchema);
