const businessHours = (process.env.BUSINESS_HOURS || '08:00-23:50').split('-');

function isWithinBusinessHours(date = new Date()) {
  const [start, end] = businessHours;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutesNow = date.getHours() * 60 + date.getMinutes();
  const minutesStart = sh * 60 + sm;
  const minutesEnd = eh * 60 + em;
  return minutesNow >= minutesStart && minutesNow <= minutesEnd;
}

function getDeviceFingerprint(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || 'unknown'
  };
}

function isTrustedDevice(sessionDevice, currentDevice) {
  if (!sessionDevice) return true;
  const uaMatch = (sessionDevice.userAgent || '').split(' ')[0] === (currentDevice.userAgent || '').split(' ')[0];
  const ipA = (sessionDevice.ip || '').split(':').pop();
  const ipB = (currentDevice.ip || '').split(':').pop();
  const sameSubnet = ipA && ipB && ipA.split('.').slice(0,2).join('.') === ipB.split('.').slice(0,2).join('.');
  return uaMatch && sameSubnet;
}

function isDepartmentAllowed(userDepartment, patientDepartment) {
  if (!patientDepartment) return true;
  return userDepartment && userDepartment === patientDepartment;
}

function isAssignedToPatient(user, patient) {
  if (!patient) return false;
  if (user.role === 'doctor') return true;
  if (user.role === 'nurse') {
    const assigned = patient.assignedNurseIds || [];
    return assigned.includes(user.userId);
  }
  return true;
}

module.exports = {
  isWithinBusinessHours,
  getDeviceFingerprint,
  isTrustedDevice,
  isDepartmentAllowed,
  isAssignedToPatient
};


