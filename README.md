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

## Four-Tier Security Architecture

This system implements a **progressive four-tier security architecture**:

### Tier Overview
| Tier | Avg Latency | Security Level | Use Case |
|------|-------------|----------------|----------|
| **1. Baseline** | 5.06ms | Minimal | Testing/benchmarking only |
| **2. Zero Trust** | 34.32ms | Standard | Production environments |
| **3. Context-Aware** | 31.75ms ⚡ | Enhanced | High-performance production |
| **4. Privacy-Preserving** | 49.93ms | Maximum | HIPAA/GDPR compliance |

### Key Features by Tier

#### Tier 1: Baseline
- JWT authentication only
- No session tracking
- Performance baseline for comparison

#### Tier 2: Zero Trust
- Continuous verification
- Session management
- Access logging
- Session revocation

#### Tier 3: Context-Aware (⚡ Optimized)
- All Zero Trust features
- Trust score calculation (15-min cache)
- Device fingerprinting
- Business hours enforcement
- Department-based filtering
- **7.5% faster than Zero Trust** through intelligent caching

#### Tier 4: Privacy-Preserving
- All Context-Aware features
- Field-level encryption (AES-256-GCM)
- Differential Privacy (ε=1.0)
- Homomorphic Encryption (Paillier)
- Privacy-preserving computations

### Switching Between Tiers

```bash
# Copy tier-specific environment configuration
cd backend

# For Baseline tier
copy .env.baseline .env

# For Zero Trust tier
copy .env.zerotrust .env

# For Context-Aware tier
copy .env.contextaware .env

# For Privacy-Preserving tier
copy .env.privacy .env

# Restart server
npm start
```

### Documentation

For detailed tier architecture, implementation details, and performance analysis:
- 📘 **[TIER_ARCHITECTURE.md](TIER_ARCHITECTURE.md)** - Complete tier documentation
- 📊 **[CONTEXT_AWARE_OPTIMIZATION.md](CONTEXT_AWARE_OPTIMIZATION.md)** - Optimization details
- 📝 **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- 📈 **[OPTIMIZATION_RESULTS.md](OPTIMIZATION_RESULTS.md)** - Benchmark results

### Academic Research

This implementation demonstrates:
- Progressive security enhancement across tiers
- Performance optimization through intelligent caching
- Privacy-preserving techniques in healthcare
- Empirical validation of security/performance trade-offs

**Key Finding**: Context-Aware tier achieves **higher security** than Zero Trust with **7.5% better performance** through session caching and early exit strategies.

## Future Enhancements

### Planned Features
- Redis-based session storage for production
- PostgreSQL database integration
- Advanced ML-based trust scoring
- Multi-factor authentication (MFA)
- Blockchain-based audit logs
- Federated learning for multi-institution data

### Research Extensions
- **Tier 5**: ML-Enhanced anomaly detection
- **Tier 6**: Blockchain immutable logs
- **Tier 7**: Federated learning across institutions

## License

MIT

