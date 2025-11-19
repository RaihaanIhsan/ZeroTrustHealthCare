// In-memory user store (in production, use a proper database)
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@hospital.com',
    password: 'admin123', // Will be hashed on initialization
    role: 'admin',
    department: 'Administration'
  },
  {
    id: '2',
    username: 'doctor1',
    email: 'doctor1@hospital.com',
    password: 'doctor123', // Will be hashed on initialization
    role: 'doctor',
    department: 'Cardiology'
  },
  {
    id: '3',
    username: 'nurse1',
    email: 'nurse1@hospital.com',
    password: 'nurse123', // Will be hashed on initialization
    role: 'nurse',
    department: 'Emergency'
  },
  {
    id: '4',
    username: 'nurse4',
    email: 'nurse4@hospital.com',
    password: 'nurse1234', // Will be hashed on initialization
    role: 'nurse',
    department: 'Cardiology'
  },
  {
    id: '5',
    username: 'doctor2',
    email: 'doctor2@hospital.com',
    password: 'doctorabc', // Will be hashed on initialization
    role: 'doctor',
    department: 'Emergency'
  }
];

// Initialize with hashed passwords
async function initializeUsers() {
  for (const user of users) {
    if (user.password.length < 60) { // Not hashed yet (bcrypt hashes are 60 chars)
      user.password = await bcrypt.hash(user.password, 10);
    }
  }
}

// Initialize users on module load
initializeUsers();

const findUserByUsername = async (username) => {
  return users.find(u => u.username === username);
};

const findUserById = async (id) => {
  return users.find(u => u.id === id);
};

const findUserByEmail = async (email) => {
  return users.find(u => u.email === email);
};

const createUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = {
    id: uuidv4(),
    ...userData,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  return newUser;
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const getAllUsers = async () => {
  return users.map(u => ({ ...u, password: undefined }));
};

module.exports = {
  findUserByUsername,
  findUserById,
  findUserByEmail,
  createUser,
  verifyPassword,
  getAllUsers,
  users
};

