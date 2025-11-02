import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getPatients = async () => {
  const response = await axios.get(`${API_URL}/patients`);
  return response.data;
};

export const getPatient = async (id) => {
  const response = await axios.get(`${API_URL}/patients/${id}`);
  return response.data;
};

export const createPatient = async (patientData) => {
  const response = await axios.post(`${API_URL}/patients`, patientData);
  return response.data;
};

export const updatePatient = async (id, patientData) => {
  const response = await axios.put(`${API_URL}/patients/${id}`, patientData);
  return response.data;
};

export const deletePatient = async (id) => {
  const response = await axios.delete(`${API_URL}/patients/${id}`);
  return response.data;
};

export const getAppointments = async () => {
  const response = await axios.get(`${API_URL}/appointments`);
  return response.data;
};

export const getAppointment = async (id) => {
  const response = await axios.get(`${API_URL}/appointments/${id}`);
  return response.data;
};

export const createAppointment = async (appointmentData) => {
  const response = await axios.post(`${API_URL}/appointments`, appointmentData);
  return response.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const response = await axios.put(`${API_URL}/appointments/${id}`, appointmentData);
  return response.data;
};

export const deleteAppointment = async (id) => {
  const response = await axios.delete(`${API_URL}/appointments/${id}`);
  return response.data;
};

export const getMetrics = async () => {
  const response = await axios.get(`${API_URL}/metrics`);
  return response.data;
};

