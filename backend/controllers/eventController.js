import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';

// Create event
export const createEvent = async (req, res) => {
  try {
    const { title, description, category, type, date, endDate, time, location, capacity, registrationDeadline } = req.body;

    const event = new Event({
      title,
      description,
      category,
      type,
      date,
      endDate,
      time,
      location,
      capacity,
      registrationDeadline,
      createdBy: req.user.userId,
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const { type, category } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (category) filter.category = category;

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .populate('registeredStudents', 'name email')
      .sort({ date: 1 });

    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('registeredStudents', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Register for event
export const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;

    // Check if already registered
    const existingRegistration = await EventRegistration.findOne({
      student: req.user.userId,
      event: eventId,
    });

    if (existingRegistration) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Create registration
    const registration = new EventRegistration({
      student: req.user.userId,
      event: eventId,
    });

    await registration.save();

    // Add student to event's registered students
    await Event.findByIdAndUpdate(
      eventId,
      { $push: { registeredStudents: req.user.userId } },
      { new: true }
    );

    res.status(201).json({
      message: 'Successfully registered for event',
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's registered events
export const getMyEvents = async (req, res) => {
  try {
    const registrations = await EventRegistration.find({ student: req.user.userId })
      .populate('event');

    const events = registrations.map(reg => reg.event);

    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is creator
    if (event.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is creator
    if (event.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
