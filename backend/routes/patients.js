// const express = require('express');
// const router = express.Router();
// const { checkRole, checkResourceAccess } = require('../middleware/zeroTrust');
// const { listPatients, findPatientById, createPatient, updatePatientByIndex, deletePatientByIndex } = require('../models/patient');

// // Patients are stored in ../models/patient

// // Zero Trust: Get all patients (only doctors and admins)
// router.get('/', checkRole('doctor', 'admin'), checkResourceAccess, (req, res) => {
//   const patients = listPatients();
//   res.json({
//     patients,
//     count: patients.length,
//     zeroTrustAction: 'ACCESS_GRANTED',
//     accessedBy: req.user.role
//   });
// });

// // Zero Trust: Get patient by ID with role-based filtering
// router.get('/:id', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
//   const patient = findPatientById(req.params.id);
  
//   if (!patient) {
//     return res.status(404).json({ 
//       error: 'Patient not found',
//       zeroTrustAction: 'RESOURCE_NOT_FOUND'
//     });
//   }

//   // Zero Trust: Nurses get limited information
//   if (req.user.role === 'nurse') {
//     const limitedPatient = {
//       id: patient.id,
//       name: patient.name,
//       age: patient.age,
//       medicalRecordNumber: patient.medicalRecordNumber,
//       allergies: patient.allergies // Important for care
//     };
//     return res.json({
//       patient: limitedPatient,
//       zeroTrustAction: 'LIMITED_ACCESS_GRANTED',
//       role: req.user.role
//     });
//   }

//   res.json({
//     patient,
//     zeroTrustAction: 'FULL_ACCESS_GRANTED',
//     role: req.user.role
//   });
// });

// // Zero Trust: Create patient (only admins and doctors)
// router.post('/', checkRole('admin', 'doctor'), (req, res) => {
//   const { name, age, gender, medicalRecordNumber, bloodType, allergies, chronicConditions, department, assignedNurseIds } = req.body;
  
//   if (!name || !age || !medicalRecordNumber) {
//     return res.status(400).json({ 
//       error: 'Name, age, and medical record number are required',
//       zeroTrustAction: 'VALIDATION_FAILED'
//     });
//   }

//   const patients = listPatients();
//   const newPatient = {
//     id: (patients.length + 1).toString(),
//     name,
//     age,
//     gender,
//     medicalRecordNumber,
//     bloodType,
//     allergies: allergies || [],
//     chronicConditions: chronicConditions || [],
//     department: department || req.user.department || 'General',
//     assignedNurseIds: assignedNurseIds || [],
//     createdAt: new Date().toISOString(),
//     createdBy: req.user.userId
//   };
//   createPatient(newPatient);

//   res.status(201).json({
//     patient: newPatient,
//     message: 'Patient created successfully',
//     zeroTrustAction: 'RESOURCE_CREATED',
//     createdBy: req.user.role
//   });
// });

// // Zero Trust: Update patient (only doctors and admins)
// router.put('/:id', checkRole('admin', 'doctor'), checkResourceAccess, (req, res) => {
//   const patients = listPatients();
//   const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
//   if (patientIndex === -1) {
//     return res.status(404).json({ 
//       error: 'Patient not found',
//       zeroTrustAction: 'RESOURCE_NOT_FOUND'
//     });
//   }

//   const updatedPatient = {
//     ...patients[patientIndex],
//     ...req.body,
//     updatedAt: new Date().toISOString(),
//     updatedBy: req.user.userId
//   };

//   updatePatientByIndex(patientIndex, updatedPatient);

//   res.json({
//     patient: updatedPatient,
//     message: 'Patient updated successfully',
//     zeroTrustAction: 'RESOURCE_UPDATED',
//     updatedBy: req.user.role
//   });
// });

// // Zero Trust: Delete patient (only admins)
// router.delete('/:id', checkRole('admin'), checkResourceAccess, (req, res) => {
//   const patients = listPatients();
//   const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
//   if (patientIndex === -1) {
//     return res.status(404).json({ 
//       error: 'Patient not found',
//       zeroTrustAction: 'RESOURCE_NOT_FOUND'
//     });
//   }

//   deletePatientByIndex(patientIndex);

//   res.json({
//     message: 'Patient deleted successfully',
//     zeroTrustAction: 'RESOURCE_DELETED',
//     deletedBy: req.user.role
//   });
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const { checkRole, checkResourceAccess } = require('../middleware/zeroTrust');
const { listPatients, findPatientById, createPatient, updatePatientByIndex, deletePatientByIndex } = require('../models/patient');
const { recordAccessAttempt } = require('../models/metrics');

// Patients are stored in ../models/patient

// MODIFIED: Get all patients with department filtering
router.get('/', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  const allPatients = listPatients();
  let filteredPatients = allPatients;

  // Zero Trust: Admin sees all. Doctor/Nurse see only their department.
  if (req.user.role === 'doctor' || req.user.role === 'nurse') {
    filteredPatients = allPatients.filter(p => p.department === req.user.department);
  }

  // Zero Trust: Nurses get limited information (on their department's patients)
  if (req.user.role === 'nurse') {
    filteredPatients = filteredPatients.map(patient => ({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      medicalRecordNumber: patient.medicalRecordNumber,
      allergies: patient.allergies, // Important for care
      department: patient.department
    }));
  }

  res.json({
    patients: filteredPatients,
    count: filteredPatients.length,
    zeroTrustAction: 'ACCESS_GRANTED',
    accessedBy: req.user.role,
    department: req.user.department
  });
});

// Zero Trust: Get patient by ID with role-based filtering
// NOTE: Department check is now handled in zeroTrust.js middleware for doctor/nurse
router.get('/:id', checkRole('doctor', 'admin', 'nurse'), checkResourceAccess, (req, res) => {
  const patient = findPatientById(req.params.id);
  
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
      allergies: patient.allergies, // Important for care
      department: patient.department
    };
    return res.json({
      patient: limitedPatient,
      zeroTrustAction: 'LIMITED_ACCESS_GRANTED',
      role: req.user.role
    });
  }

  // Admin and Doctor (who passed middleware check) get full details
  res.json({
    patient,
    zeroTrustAction: 'FULL_ACCESS_GRANTED',
    role: req.user.role
  });
});

// MODIFIED: Create patient (only admins and doctors)
router.post('/', checkRole('admin', 'doctor'), (req, res) => {
  // ADDED 'department' to destructuring and validation
  const { name, age, gender, medicalRecordNumber, bloodType, allergies, chronicConditions, department } = req.body;
  
  if (!name || !age || !medicalRecordNumber || !department) {
    return res.status(400).json({ 
      error: 'Name, age, medical record number, and department are required',
      zeroTrustAction: 'VALIDATION_FAILED'
    });
  }

  const patients = listPatients();
  const newPatient = {
    id: (patients.length + 1).toString(),
    name,
    age,
    gender,
    medicalRecordNumber,
    bloodType,
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
    department: department, // Use provided department
    assignedNurseIds: [], // This could be auto-assigned based on department
    createdAt: new Date().toISOString(),
    createdBy: req.user.userId
  };
  createPatient(newPatient);

  res.status(201).json({
    patient: newPatient,
    message: 'Patient created successfully',
    zeroTrustAction: 'RESOURCE_CREATED',
    createdBy: req.user.role
  });
});

// Zero Trust: Update patient (only doctors and admins)
router.put('/:id', checkRole('admin', 'doctor'), checkResourceAccess, (req, res) => {
  const patients = listPatients();
  const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
  if (patientIndex === -1) {
    return res.status(404).json({ 
      error: 'Patient not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  // Security Check: Prevent doctor from changing patient's department
  if (req.user.role === 'doctor' && req.body.department && req.body.department !== patients[patientIndex].department) {
      recordAccessAttempt(req.ip, req.user.userId, 'DENIED', `Doctor attempted to change patient department.`);
      // THIS IS THE LINE I FIXED
      return res.status(403).json({ 
          error: 'Doctors cannot change a patient\'s department.',
          zeroTrustAction: 'OPERATION_DENIED'
      });
  }

  const updatedPatient = {
    ...patients[patientIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.userId
  };

  updatePatientByIndex(patientIndex, updatedPatient);

  res.json({
    patient: updatedPatient,
    message: 'Patient updated successfully',
    zeroTrustAction: 'RESOURCE_UPDATED',
    updatedBy: req.user.role
  });
});

// Zero Trust: Delete patient (only admins)
router.delete('/:id', checkRole('admin'), checkResourceAccess, (req, res) => {
  const patients = listPatients();
  const patientIndex = patients.findIndex(p => p.id === req.params.id);
  
  if (patientIndex === -1) {
    return res.status(404).json({ 
      error: 'Patient not found',
      zeroTrustAction: 'RESOURCE_NOT_FOUND'
    });
  }

  deletePatientByIndex(patientIndex);

  res.json({
    message: 'Patient deleted successfully',
    zeroTrustAction: 'RESOURCE_DELETED',
    deletedBy: req.user.role
  });
});

module.exports = router;