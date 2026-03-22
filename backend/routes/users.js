const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

// Log when this router is entered
router.use((req, res, next) => {
    console.log(`[UsersRoutes] Handling request: ${req.method} ${req.originalUrl} (Base URL: ${req.baseUrl}, Path: ${req.path})`);
    next();
});

// Get all users - public route for staff selection
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    
    let filter = { isActive: true };
    
    // Filter by role if specified
    if (role) {
      filter.role = role;
    }
    
    const users = await User.find(filter)
      .select('firstName lastName role specialization email')
      .lean();
    
    // Format users for frontend compatibility
    const formattedUsers = users.map(user => ({
      id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      specialization: user.specialization || '',
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }));
    
    console.log(`[/users] Found ${formattedUsers.length} users${role ? ` with role: ${role}` : ''}`);
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('[/users] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get doctors only
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('firstName lastName specialization email')
      .lean();
    
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      firstName: doctor.firstName || '',
      lastName: doctor.lastName || '',
      role: 'doctor',
      specialization: doctor.specialization || '',
      email: doctor.email,
      name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    }));
    
    console.log(`[/users/doctors] Found ${formattedDoctors.length} doctors`);
    
    res.json(formattedDoctors);
  } catch (error) {
    console.error('[/users/doctors] Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
  }
});

// Get nurses only
router.get('/nurses', async (req, res) => {
  try {
    const nurses = await User.find({ role: 'nurse', isActive: true })
      .select('firstName lastName email')
      .lean();
    
    const formattedNurses = nurses.map(nurse => ({
      id: nurse._id,
      firstName: nurse.firstName || '',
      lastName: nurse.lastName || '',
      role: 'nurse',
      email: nurse.email,
      name: `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim()
    }));
    
    console.log(`[/users/nurses] Found ${formattedNurses.length} nurses`);
    
    res.json(formattedNurses);
  } catch (error) {
    console.error('[/users/nurses] Error fetching nurses:', error);
    res.status(500).json({ error: 'Failed to fetch nurses', details: error.message });
  }
});

// Get lab technicians only
router.get('/lab-technicians', async (req, res) => {
  try {
    const labTechs = await User.find({ role: 'lab', isActive: true })
      .select('firstName lastName email')
      .lean();
    
    const formattedLabTechs = labTechs.map(tech => ({
      id: tech._id,
      firstName: tech.firstName || '',
      lastName: tech.lastName || '',
      role: 'lab_technician',
      email: tech.email,
      name: `${tech.firstName || ''} ${tech.lastName || ''}`.trim()
    }));
    
    console.log(`[/users/lab-technicians] Found ${formattedLabTechs.length} lab technicians`);
    
    res.json(formattedLabTechs);
  } catch (error) {
    console.error('[/users/lab-technicians] Error fetching lab technicians:', error);
    res.status(500).json({ error: 'Failed to fetch lab technicians', details: error.message });
  }
});

module.exports = router; 
