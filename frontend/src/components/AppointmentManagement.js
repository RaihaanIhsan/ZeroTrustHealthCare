import React, { useState, useEffect } from 'react';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getPatients } from '../services/api';
import './AppointmentManagement.css';

const AppointmentManagement = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtered patients list for the dropdown
  const [availablePatients, setAvailablePatients] = useState([]);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    date: '',
    time: '',
    type: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]); // Refetch if user changes

  const fetchData = async () => {
    try {
      const [appointmentsData, patientsData] = await Promise.all([
        getAppointments(),
        getPatients() // This will now correctly return only patients in the user's dept if not admin
      ]);
      setAppointments(appointmentsData.appointments || []);
      setPatients(patientsData.patients || []); // This is the list of patients for the dropdown

      // Set available patients for the form dropdown
      if(user.role === 'admin') {
        // Admin can see all patients from the raw getPatients() call
        // Need to fetch *all* patients for admin dropdown
        const allPatientsData = await getPatients(); // This is a bit inefficient, but works for demo
        setAvailablePatients(allPatientsData.patients || []);
      } else {
        // Doctor/Nurse can only select from patients in their dept
        setAvailablePatients(patientsData.patients || []);
      }

      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, formData);
        setSuccess('Appointment updated successfully');
      } else {
        await createAppointment(formData);
        setSuccess('Appointment created successfully');
      }

      setShowForm(false);
      setEditingAppointment(null);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      patientId: appointment.patientId || '',
      patientName: appointment.patientName || '',
      doctorId: appointment.doctorId || '',
      doctorName: appointment.doctorName || '',
      date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : '', // Format date for input
      time: appointment.time || '',
      type: appointment.type || '',
      notes: appointment.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await deleteAppointment(id);
      setSuccess('Appointment deleted successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete appointment');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      doctorId: '',
      doctorName: '',
      date: '',
      time: '',
      type: '',
      notes: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading appointments...</div>;
  }

  const canCreate = user.role === 'admin' || user.role === 'doctor';
  const canEdit = user.role === 'admin' || user.role === 'doctor';
  const canDelete = user.role === 'admin';

  return (
    <div className="appointment-management">
      <div className="header-section">
        <h1>Appointment Management</h1>
        {canCreate && (
          <button onClick={() => { setShowForm(true); setEditingAppointment(null); resetForm(); }} className="btn btn-primary">
            + Add Appointment
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-card">
            <h2>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Patient *</label>
                  <select
                    value={formData.patientId}
                    onChange={(e) => {
                      // Find from the correct patient list
                      const patient = (user.role === 'admin' ? availablePatients : patients).find(p => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        patientId: e.target.value,
                        patientName: patient ? patient.name : ''
                      });
                    }}
                    required
                  >
                    <option value="">Select Patient</option>
                    {/* MODIFIED: Use the correct patient list for dropdown */}
                    {(user.role === 'admin' ? availablePatients : patients).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (MRN: {p.medicalRecordNumber})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Checkup">Checkup</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  placeholder="Dr. Name"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingAppointment ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Appointments List</h2>
        {appointments.length === 0 ? (
          <p>No appointments found for your department.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Department</th> {/* ADDED */}
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Status</th>
                {user.role !== 'nurse' && <th>Doctor</th>}
                {user.role !== 'nurse' && <th>Notes</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.patientName}</td>
                  <td>{appointment.department}</td> {/* ADDED */}
                  <td>{new Date(appointment.date).toLocaleDateString()}</td>
                  <td>{appointment.time}</td>
                  <td>{appointment.type}</td>
                  <td>
                    <span className={`status-badge status-${appointment.status?.toLowerCase() || 'scheduled'}`}>
                      {appointment.status || 'Scheduled'}
                    </span>
                  </td>
                  {user.role !== 'nurse' && <td>{appointment.doctorName || 'N/A'}</td>}
                  {user.role !== 'nurse' && <td>{appointment.notes || 'N/A'}</td>}
                  <td>
                    <div className="action-buttons">
                      {/* MODIFIED: View button logic is now handled by role */}
                      <button onClick={() => handleEdit(appointment)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        View
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(appointment)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(appointment.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
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
            <strong>Note:</strong> As a nurse, you can only see appointments in your department and have limited access to information.
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentManagement;