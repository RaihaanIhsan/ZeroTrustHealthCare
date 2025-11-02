# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and change `JWT_SECRET` to a secure random string.

3. **Start the backend:**
   ```bash
   npm run dev
   ```

4. **In a new terminal, start the frontend:**
   ```bash
   npm run client
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Demo Accounts

- **Admin**: username: `admin`, password: `admin123`
- **Doctor**: username: `doctor1`, password: `doctor123`
- **Nurse**: username: `nurse1`, password: `nurse123`

## Zero Trust Features

This implementation demonstrates:
- Token-based authentication
- Session management with revocation
- Role-based access control (RBAC)
- Continuous verification
- Access logging and metrics
- Least privilege principle

## Notes

- Passwords are automatically hashed on server startup
- Sessions are tracked in memory (use Redis/database in production)
- Metrics are collected in memory (persist to database in production)

