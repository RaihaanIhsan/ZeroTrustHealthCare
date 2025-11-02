const express = require('express');
const router = express.Router();
const { checkRole, checkResourceAccess } = require('../middleware/zeroTrust');

// In-memory appointment store
const appointments = [
  {
    id: '1',
    patientId: '1',
    patientName: 'John Doe',
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

// Zero Trust: Get all appointments (role-based filtering)
router.get('/', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  // Zero Trust: Filter based on role - nurses see limited info
  let filteredAppointments = appointments;
  
  if (req.user.role === 'nurse') {
    filteredAppointments = appointments.map(apt => ({
      id: apt.id,
      patientName: apt.patientName,
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
router.get('/:id', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  const appointment = appointments.find(a => a.id === req.params.id);
  
  if (!appointment) {
    return res.status(404).json({ 
      error: 'Appointment not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  // Zero Trust: Nurses get limited information
  if (req.user.role === 'nurse') {
    const limitedAppointment = {
      id: appointment.id,
      patientName: appointment.patientName,
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
router.post('/', checkRole('admin', 'doctor'), (req, res) => {
  const { patientId, patientName, doctorId, doctorName, date, time, type, notes } = req.body;
  
  if (!patientId || !date || !time || !type) {
    return res.status(400).json({ 
      error: 'Patient ID, date, time, and type are required',
      zeroTrustAction: 'VALIDATION_FAILED'
    });
  }

  const newAppointment = {
    id: (appointments.length + 1).toString(),
    patientId,
    patientName: patientName || 'Unknown',
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

  const updatedAppointment = {
    ...appointments[appointmentIndex],
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

