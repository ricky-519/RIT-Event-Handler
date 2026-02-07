import User from '../models/User.js';
import { generateToken } from '../utils/helpers.js';

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, registrationNumber, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if registration number already exists (only if provided)
    if (registrationNumber) {
      const existingRegNumber = await User.findOne({ registrationNumber });
      if (existingRegNumber) {
        return res.status(400).json({ message: 'Registration number already exists' });
      }
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'STUDENT',
      department,
      registrationNumber: registrationNumber || undefined, // Only include if provided
      phone,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
