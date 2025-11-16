# Zero Trust Healthcare System

A privacy-preserving, context-based zero trust application for healthcare systems. This implementation focuses on **Zero Trust Architecture** principles to secure healthcare data and operations.

## 🔒 Zero Trust Architecture

This system implements the following zero trust principles:

1. **Never Trust, Always Verify**: Every request requires token verification
2. **Least Privilege Access**: Role-based access control (RBAC) with granular permissions
3. **Continuous Verification**: Ongoing monitoring and session validation
4. **Micro-segmentation**: Resource-level access control
5. **Defense in Depth**: Multiple security layers (rate limiting, helmet, CORS)

## Features

- **Authentication**: Token-based authentication with JWT
- **Session Management**: Active session tracking and revocation
- **Role-Based Access Control**: Admin, Doctor, and Nurse roles with different permissions
- **Patient Management**: Secure patient record management
- **Appointment Management**: Healthcare appointment scheduling
- **Security Metrics**: Real-time monitoring of zero trust effectiveness
- **Access Logging**: Comprehensive logging of all access attempts

## Project Structure

```
ztnew/
├── backend/
│   ├── middleware/
│   │   └── zeroTrust.js      # Zero Trust verification middleware
│   ├── models/
│   │   ├── user.js            # User management
│   │   ├── session.js         # Session management
│   │   └── metrics.js        # Security metrics
|   |   |__ patients.js       #patient db
│   ├── policies/
│   │   ├── context.js
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── patients.js        # Patient management routes
│   │   ├── appointments.js    # Appointment routes
│   │   └── metrics.js         # Metrics routes
│   └── server.js              # Express server
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API services
│   │   └── App.js
│   └── package.json
└── package.json
```

## Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set your `JWT_SECRET` (change the default value!)

## Running the Application

1. **Start the backend server:**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5000`

2. **Start the frontend (in a new terminal):**
   ```bash
   npm run client
   ```
   Frontend will run on `http://localhost:3000`

## Demo Credentials

- **Admin**: `admin` / `admin123`
- **Doctor**: `doctor1` / `doctor123`
- **Nurse**: `nurse1` / `nurse123`

## Zero Trust + Context-Based Controls

### Authentication Flow
1. User logs in with credentials
2. Server validates credentials
3. Creates a session with device info
4. Generates JWT token with session ID
5. Token is required for all subsequent requests

### Authorization & Context Flow
1. Every request includes JWT token
2. Middleware verifies token signature
3. Checks if session is still active
4. Verifies user role for endpoint access
5. Evaluates context policies:
   - Department match (doctor must match patient department)
   - Nurse assignment (nurse must be assigned to department)
   - Device consistency (IP subnet and UA family)
   - Time window (BUSINESS_HOURS env)
6. Applies resource-level permissions
7. Logs all access attempts

### Security Features
- **Token Expiration**: Tokens expire after 24 hours
- **Session Revocation**: Sessions can be revoked immediately
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for specific origin
- **Helmet Security**: HTTP headers protection
 - **Context Enforcement**: Department, assignment, device, and time-based checks

### Environment
You can change business hours for context checks via:

```
BUSINESS_HOURS=08:00-18:00
```

## Role Permissions

| Action | Admin | Doctor | Nurse |
|--------|-------|--------|-------|
| View Patients | ✓ | ✓ | Limited |
| Create Patients | ✓ | ✓ | ✗ |
| Edit Patients | ✓ | ✓ | ✗ |
| Delete Patients | ✓ | ✗ | ✗ |
| View Appointments | ✓ | ✓ | Limited |
| Create Appointments | ✓ | ✓ | ✗ |
| Edit Appointments | ✓ | ✓ | ✗ |
| Delete Appointments | ✓ | ✗ | ✗ |
| View Metrics | ✓ | ✗ | ✗ |

## Metrics & Monitoring

The system tracks:
- **Access Attempts**: Total, granted, denied with reasons
- **Authentication Events**: Login/logout success and failures
- **Session Metrics**: Active sessions, revocations
- **Security Score**: Overall zero trust effectiveness (0-100)

Access metrics dashboard in the admin panel to view real-time security metrics.

## Future Enhancements

This is the **Zero Trust** implementation. Future versions will include:
- **Privacy Preserving**: Encryption, data anonymization
- **Context-Based**: Dynamic access control based on user context

## License

MIT

