// backend/models/privacy.js
// Privacy-Preserving Layer 1: Field-Level Encryption

const crypto = require('crypto');

// Configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Master encryption key (in production, use AWS KMS, HashiCorp Vault, etc.)
// For demo: derived from environment variable
const MASTER_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY || 'healthcare-privacy-master-key-change-in-production',
  'salt', // In production, use unique salt stored securely
  KEY_LENGTH
);

/**
 * Encrypt sensitive field data
 * @param {string} plaintext - Data to encrypt
 * @returns {string} - Encrypted data in format: iv:encrypted:tag
 */
function encryptField(plaintext) {
  const startTime = Date.now();
  
  if (!plaintext) return null;
  
  try {
    // Generate random IV for each encryption (ensures unique ciphertexts)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
    
    // Encrypt
    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (GCM mode provides authenticated encryption)
    const tag = cipher.getAuthTag();
    
    // Performance tracking
    const duration = Date.now() - startTime;
    recordPrivacyMetric('encryption', duration);
    
    // Return format: iv:encrypted:tag (all in hex)
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Field encryption failed');
  }
}

/**
 * Decrypt sensitive field data
 * @param {string} encryptedData - Data in format: iv:encrypted:tag
 * @returns {string} - Decrypted plaintext
 */
function decryptField(encryptedData) {
  const startTime = Date.now();
  
  if (!encryptedData) return null;
  
  try {
    // Parse encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Performance tracking
    const duration = Date.now() - startTime;
    recordPrivacyMetric('decryption', duration);
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Field decryption failed');
  }
}

/**
 * Encrypt entire patient object (sensitive fields only)
 * @param {Object} patient - Patient data
 * @returns {Object} - Patient with encrypted fields
 */
function encryptPatient(patient) {
  const startTime = Date.now();
  
  const encrypted = {
    ...patient,
    name: encryptField(patient.name),
    medicalRecordNumber: encryptField(patient.medicalRecordNumber),
    allergies: encryptField(JSON.stringify(patient.allergies || [])),
    chronicConditions: encryptField(JSON.stringify(patient.chronicConditions || [])),
    // Leave non-sensitive fields unencrypted for performance
    age: patient.age,
    gender: patient.gender,
    bloodType: patient.bloodType,
    department: patient.department,
    // Add metadata
    encrypted: true,
    encryptedAt: new Date().toISOString()
  };
  
  const duration = Date.now() - startTime;
  recordPrivacyMetric('patient_encryption', duration);
  
  return encrypted;
}

/**
 * Decrypt entire patient object
 * @param {Object} encryptedPatient - Patient with encrypted fields
 * @returns {Object} - Patient with decrypted fields
 */
function decryptPatient(encryptedPatient) {
  const startTime = Date.now();
  
  if (!encryptedPatient.encrypted) {
    return encryptedPatient; // Not encrypted, return as-is
  }
  
  try {
    const decrypted = {
      ...encryptedPatient,
      name: decryptField(encryptedPatient.name),
      medicalRecordNumber: decryptField(encryptedPatient.medicalRecordNumber),
      allergies: JSON.parse(decryptField(encryptedPatient.allergies) || '[]'),
      chronicConditions: JSON.parse(decryptField(encryptedPatient.chronicConditions) || '[]'),
      encrypted: false
    };
    
    delete decrypted.encryptedAt;
    
    const duration = Date.now() - startTime;
    recordPrivacyMetric('patient_decryption', duration);
    
    return decrypted;
  } catch (error) {
    console.error('Patient decryption error:', error);
    throw new Error('Patient decryption failed');
  }
}

/**
 * Encrypt array of patients (batch operation)
 */
function encryptPatients(patients) {
  return patients.map(p => encryptPatient(p));
}

/**
 * Decrypt array of patients (batch operation)
 */
function decryptPatients(patients) {
  return patients.map(p => decryptPatient(p));
}

// Privacy metrics tracking
const privacyMetrics = {
  encryption: { count: 0, totalTime: 0 },
  decryption: { count: 0, totalTime: 0 },
  patient_encryption: { count: 0, totalTime: 0 },
  patient_decryption: { count: 0, totalTime: 0 },
  differential_privacy: { count: 0, totalTime: 0 },
  homomorphic_operations: { count: 0, totalTime: 0 }
};

function recordPrivacyMetric(operation, duration) {
  if (privacyMetrics[operation]) {
    privacyMetrics[operation].count++;
    privacyMetrics[operation].totalTime += duration;
  }
}

function getPrivacyMetrics() {
  const result = {};
  for (const [operation, data] of Object.entries(privacyMetrics)) {
    result[operation] = {
      count: data.count,
      totalTime: data.totalTime,
      avgTime: data.count > 0 ? (data.totalTime / data.count).toFixed(2) : 0
    };
  }
  return result;
}

function resetPrivacyMetrics() {
  for (const operation in privacyMetrics) {
    privacyMetrics[operation] = { count: 0, totalTime: 0 };
  }
}

module.exports = {
  encryptField,
  decryptField,
  encryptPatient,
  decryptPatient,
  encryptPatients,
  decryptPatients,
  getPrivacyMetrics,
  resetPrivacyMetrics
};