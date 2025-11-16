const express = require('express');
const router = express.Router();
const { checkRole, checkResourceAccess } = require('../middleware/zeroTrust');
const { findPatientById } = require('../models/patient');

// In-memory appointment store
const appointments = [
  {
    id: '1',
    patientId: '1',
    patientName: 'John Doe',
    department: 'Cardiology', // ADDED
    doctorId: '2',
    doctorName: 'Dr. Smith',
    date: '2024-12-15',
    time: '10:00 AM',
    type: 'Consultation',
    status: 'Scheduled',
    notes: 'Regular checkup',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Jane Smith',
    department: 'Emergency', // ADDED
    doctorId: '2',
    doctorName: 'Dr. Smith',
    date: '2024-12-16',
    time: '2:00 PM',
    type: 'Follow-up',
    status: 'Scheduled',
    notes: 'Post-surgery follow-up',
    createdAt: new Date().toISOString()
  }
];

// MODIFIED: Get all appointments (role-based filtering)
router.get('/', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  let filteredAppointments = appointments;

  // Zero Trust: Admin sees all. Doctor/Nurse see only their department.
  if (req.user.role === 'doctor' || req.user.role === 'nurse') {
    filteredAppointments = appointments.filter(apt => apt.department === req.user.department);
  }
  
  // Zero Trust: Filter based on role - nurses see limited info
  if (req.user.role === 'nurse') {
    filteredAppointments = filteredAppointments.map(apt => ({
      id: apt.id,
      patientName: apt.patientName,
      department: apt.department,
      date: apt.date,
      time: apt.time,
      type: apt.type,
      status: apt.status
    }));
  }

  res.json({
    appointments: filteredAppointments,
    count: filteredAppointments.length,
    zeroTrustAction: 'ACCESS_GRANTED',
    role: req.user.role
  });
});

// Zero Trust: Get appointment by ID
// MODIFIED: Department check is handled by middleware for doctor/nurse
router.get('/:id', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  const appointment = appointments.find(a => a.id === req.params.id);
  
  if (!appointment) {
    return res.status(404).json({ 
      error: 'Appointment not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }
  
  // MODIFIED: Add department check for nurse as well
  if ((req.user.role === 'doctor' || req.user.role === 'nurse') && appointment.department !== req.user.department) {
    return res.status(403).json({
        error: 'Access denied. You do not have permission for this appointment.',
        zeroTrustAction: 'CONTEXT_VERIFICATION_FAILED'
    });
  }


  // Zero Trust: Nurses get limited information
  if (req.user.role === 'nurse') {
    const limitedAppointment = {
      id: appointment.id,
      patientName: appointment.patientName,
      department: appointment.department,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      status: appointment.status
    };
    return res.json({
      appointment: limitedAppointment,
      zeroTrustAction: 'LIMITED_ACCESS_GRANTED',
      role: req.user.role
    });
  }

  res.json({
    appointment,
    zeroTrustAction: 'FULL_ACCESS_GRANTED',
    role: req.user.role
  });
});

// Zero Trust: Create appointment (doctors and admins)
// MODIFIED: Fetch patient to add department
router.post('/', checkRole('admin', 'doctor'), (req, res) => {
  const { patientId, patientName, doctorId, doctorName, date, time, type, notes } = req.body;
  
  if (!patientId || !date || !time || !type) {
    return res.status(400).json({ 
      error: 'Patient ID, date, time, and type are required',
      zeroTrustAction: 'VALIDATION_FAILED'
    });
  }

  const targetPatient = findPatientById(patientId);
  if (!targetPatient) {
    return res.status(404).json({ 
        error: 'Patient not found',
        zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  // Zero Trust: Context Check - Doctor/Admin can only make appts for patients in their own dept
  // Admin is allowed to bypass this check (for this demo, but could be enforced)
  if (req.user.role === 'doctor' && targetPatient.department !== req.user.department) {
    return res.status(403).json({
      error: 'Access denied. You can only create appointments for patients in your department.',
      zeroTrustAction: 'DEPARTMENT_CONTEXT_FAILED'
    });
  }

  const newAppointment = {
    id: (appointments.length + 1).toString(),
    patientId,
    patientName: patientName || targetPatient.name,
    department: targetPatient.department, // ADDED: Store patient's department
    doctorId: doctorId || req.user.userId,
    doctorName: doctorName || 'Dr. Unknown',
    date,
    time,
    type,
    status: 'Scheduled',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    createdBy: req.user.userId
  };

  appointments.push(newAppointment);

  res.status(201).json({
    appointment: newAppointment,
    message: 'Appointment created successfully',
    zeroTrustAction: 'RESOURCE_CREATED',
    createdBy: req.user.role
  });
});

// Zero Trust: Update appointment (doctors and admins)
router.put('/:id', checkRole('admin', 'doctor'), checkResourceAccess, (req, res) => {
  const appointmentIndex = appointments.findIndex(a => a.id === req.params.id);
  
  if (appointmentIndex === -1) {
    return res.status(404).json({ 
      error: 'Appointment not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  const originalAppointment = appointments[appointmentIndex];
  
  // Zero Trust: Context Check - Doctor can only update appts in their own dept
  if (req.user.role === 'doctor' && originalAppointment.department !== req.user.department) {
     return res.status(403).json({
      error: 'Access denied. You can only update appointments in your department.',
      zeroTrustAction: 'DEPARTMENT_CONTEXT_FAILED'
    });
  }

  const updatedAppointment = {
    ...originalAppointment,
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.userId
  };

  appointments[appointmentIndex] = updatedAppointment;

  res.json({
    appointment: updatedAppointment,
    message: 'Appointment updated successfully',
    zeroTrustAction: 'RESOURCE_UPDATED',
    updatedBy: req.user.role
  });
});

// Zero Trust: Delete appointment (only admins)
router.delete('/:id', checkRole('admin'), checkResourceAccess, (req, res) => {
  const appointmentIndex = appointments.findIndex(a => a.id === req.params.id);
  
  if (appointmentIndex === -1) {
    return res.status(404).json({ 
      error: 'Appointment not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  appointments.splice(appointmentIndex, 1);

  res.json({
    message: 'Appointment deleted successfully',
    zeroTrustAction: 'RESOURCE_DELETED',
    deletedBy: req.user.role
  });
});

module.exports = router;