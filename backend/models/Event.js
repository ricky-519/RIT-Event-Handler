import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add event title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add event description'],
  },
  category: {
    type: String,
    enum: ['TECHNICAL', 'CULTURAL', 'SPORTS', 'WORKSHOP', 'SEMINAR', 'OTHER'],
    required: [true, 'Please select a category'],
  },
  type: {
    type: String,
    enum: ['INTERNAL', 'EXTERNAL'],
    default: 'INTERNAL',
  },
  date: {
    type: Date,
    required: [true, 'Please add event date'],
  },
  endDate: {
    type: Date,
  },
  time: {
    type: String,
    required: [true, 'Please add event time'],
  },
  location: {
    type: String,
    required: [true, 'Please add event location'],
  },
  capacity: {
    type: Number,
    default: 100,
  },
  posterImage: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  registeredStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  registrationDeadline: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Event', eventSchema);
