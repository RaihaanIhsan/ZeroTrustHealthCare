const express = require('express');
const router = express.Router();
const { checkRole, checkResourceAccess } = require('../middleware/zeroTrust');

// In-memory patient store (in production, use a database)
const patients = [
  {
    id: '1',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    medicalRecordNumber: 'MRN001',
    bloodType: 'O+',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    medicalRecordNumber: 'MRN002',
    bloodType: 'A-',
    allergies: ['Latex'],
    chronicConditions: ['Diabetes Type 2'],
    createdAt: new Date().toISOString()
  }
];

// Zero Trust: Get all patients (only doctors and admins)
router.get('/', checkRole('doctor', 'admin'), checkResourceAccess, (req, res) => {
  res.json({
    patients,
    count: patients.length,
    zeroTrustAction: 'ACCESS_GRANTED',
    accessedBy: req.user.role
  });
});

// Zero Trust: Get patient by ID with role-based filtering
router.get('/:id', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  const patient = patients.find(p => p.id === req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      error: 'Patient not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  // Zero Trust: Nurses get limited information
  if (req.user.role === 'nurse') {
    const limitedPatient = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      medicalRecordNumber: patient.medicalRecordNumber,
      allergies: patient.allergies // Important for care
    };
    return res.json({
      patient: limitedPatient,
      zeroTrustAction: 'LIMITED_ACCESS_GRANTED',
      role: req.user.role
    });
  }

  res.json({
    patient,
    zeroTrustAction: 'FULL_ACCESS_GRANTED',
    role: req.user.role
  });
});

// Zero Trust: Create patient (only admins and doctors)
router.post('/', checkRole('admin', 'doctor'), (req, res) => {
  const { name, age, gender, medicalRecordNumber, bloodType, allergies, chronicConditions } = req.body;
  
  if (!name || !age || !medicalRecordNumber) {
    return res.status(400).json({ 
      error: 'Name, age, and medical record number are required',
      zeroTrustAction: 'VALIDATION_FAILED'
    });
  }

  const newPatient = {
    id: (patients.length + 1).toString(),
    name,
    age,
    gender,
    medicalRecordNumber,
    bloodType,
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
    createdAt: new Date().toISOString(),
    createdBy: req.user.userId
  };

  patients.push(newPatient);

  res.status(201).json({
    patient: newPatient,
    message: 'Patient created successfully',
    zeroTrustAction: 'RESOURCE_CREATED',
    createdBy: req.user.role
  });
});

// Zero Trust: Update patient (only doctors and admins)
router.put('/:id', checkRole('admin', 'doctor'), checkResourceAccess, (req, res) => {
  const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
  if (patientIndex === -1) {
    return res.status(404).json({ 
      error: 'Patient not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  const updatedPatient = {
    ...patients[patientIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.userId
  };

  patients[patientIndex] = updatedPatient;

  res.json({
    patient: updatedPatient,
    message: 'Patient updated successfully',
    zeroTrustAction: 'RESOURCE_UPDATED',
    updatedBy: req.user.role
  });
});

// Zero Trust: Delete patient (only admins)
router.delete('/:id', checkRole('admin'), checkResourceAccess, (req, res) => {
  const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
  if (patientIndex === -1) {
    return res.status(404).json({ 
      error: 'Patient not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  patients.splice(patientIndex, 1);

  res.json({
    message: 'Patient deleted successfully',
    zeroTrustAction: 'RESOURCE_DELETED',
    deletedBy: req.user.role
  });
});

module.exports = router;

