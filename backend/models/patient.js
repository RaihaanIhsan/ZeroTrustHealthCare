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
  }
];

function listPatients() {
  return patients;
}

function findPatientById(id) {
  return patients.find(p => p.id === id) || null;
}

function createPatient(patient) {
  patients.push(patient);
  return patient;
}

function updatePatientByIndex(index, updated) {
  patients[index] = updated;
  return updated;
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


