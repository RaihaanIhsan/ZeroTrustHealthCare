const { encryptPatient, decryptPatient, encryptPatients, decryptPatients } = require('./privacy');

const ENABLE_ENCRYPTION = process.env.ENABLE_FIELD_ENCRYPTION === 'true';

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
    department: 'Cardiology',
    assignedNurseIds: ['3'],
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
    department: 'Emergency',
    assignedNurseIds: ['3'],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Samantha Johnson',
    age: 55,
    gender: 'Female',
    medicalRecordNumber: 'MRN003',
    bloodType: 'B+',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    department: 'Cardiology',
    assignedNurseIds: ['3'],
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Jane Doe',
    age: 32,
    gender: 'Female',
    medicalRecordNumber: 'MRN004',
    bloodType: 'A-',
    allergies: ['Latex'],
    chronicConditions: ['Diabetes Type 2'],
    department: 'Emergency',
    assignedNurseIds: ['3'],
    createdAt: new Date().toISOString()
  }
];

function listPatients() {
  if (ENABLE_ENCRYPTION) {
    return decryptPatients(patients); // Decrypt before returning
  }
  return patients;
}

function findPatientById(id) {
  const patient = patients.find(p => p.id === id);
  if (!patient) return null;
  
  if (ENABLE_ENCRYPTION && patient.encrypted) {
    return decryptPatient(patient);
  }
  return patient;
}

function createPatient(patient) {
  const patientToStore = ENABLE_ENCRYPTION ? encryptPatient(patient) : patient;
  patients.push(patientToStore);
  return patient; // Return unencrypted to caller
}

function updatePatientByIndex(index, updated) {
  const patientToStore = ENABLE_ENCRYPTION ? encryptPatient(updated) : updated;
  patients[index] = patientToStore;
  return updated; // Return unencrypted to caller
}

function deletePatientByIndex(index) {
  patients.splice(index, 1);
}

module.exports = {
  patients,
  listPatients,
  findPatientById,
  createPatient,
  updatePatientByIndex,
  deletePatientByIndex
};


