import React, { useState, useEffect } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../services/api';
import './PatientManagement.css';

const PatientManagement = ({ user }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    medicalRecordNumber: '',
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    department: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data.patients || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const patientData = {
        ...formData,
        age: parseInt(formData.age),
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a),
        chronicConditions: formData.chronicConditions.split(',').map(c => c.trim()).filter(c => c)
      };

      if (editingPatient) {
        await updatePatient(editingPatient.id, patientData);
        setSuccess('Patient updated successfully');
      } else {
        await createPatient(patientData);
        setSuccess('Patient created successfully');
      }

      setShowForm(false);
      setEditingPatient(null);
      resetForm();
      fetchPatients();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || '',
      medicalRecordNumber: patient.medicalRecordNumber || '',
      bloodType: patient.bloodType || '',
      allergies: (patient.allergies || []).join(', '),
      chronicConditions: (patient.chronicConditions || []).join(', '),
      department: patient.department || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) {
      return;
    }

    try {
      await deletePatient(id);
      setSuccess('Patient deleted successfully');
      fetchPatients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete patient');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      gender: '',
      medicalRecordNumber: '',
      bloodType: '',
      allergies: '',
      chronicConditions: '',
      department: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading patients...</div>;
  }

  const canCreate = user.role === 'admin' || user.role === 'doctor';
  const canEdit = user.role === 'admin' || user.role === 'doctor';
  const canDelete = user.role === 'admin';

  return (
    <div className="patient-management">
      <div className="header-section">
        <h1>Patient Management</h1>
        {canCreate && (
          <button onClick={() => { setShowForm(true); setEditingPatient(null); resetForm(); }} className="btn btn-primary">
            + Add Patient
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-card">
            <h2>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Medical Record Number *</label>
                  <input
                    type="text"
                    value={formData.medicalRecordNumber}
                    onChange={(e) => setFormData({ ...formData, medicalRecordNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
              <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Administration">Administration</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Emergency">Emergency</option>
                    <option value="General">General</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Type</label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Allergies (comma-separated)</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g., Penicillin, Latex"
                />
              </div>

              <div className="form-group">
                <label>Chronic Conditions (comma-separated)</label>
                <input
                  type="text"
                  value={formData.chronicConditions}
                  onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                  placeholder="e.g., Hypertension, Diabetes"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingPatient ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingPatient(null); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Patients List</h2>
        {patients.length === 0 ? (
          <p>No patients found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Medical Record # </th>
                <th>Department</th>
                {user.role !== 'nurse' && <th>Blood Type</th>}
                {user.role !== 'nurse' && <th>Allergies</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.name}</td>
                  <td>{patient.age}</td>
                  <td>{patient.medicalRecordNumber}</td>
                  <td>{patient.department || 'N/A'}</td>
                  {user.role !== 'nurse' && <td>{patient.bloodType || 'N/A'}</td>}
                  {user.role !== 'nurse' && <td>{(patient.allergies || []).join(', ') || 'None'}</td>}
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(patient)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        View
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(patient)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(patient.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {user.role === 'nurse' && (
          <div className="alert alert-info">
            <strong>Note:</strong> As a nurse, you have limited access to patient information for privacy protection.
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientManagement;

