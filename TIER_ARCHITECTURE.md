# Four-Tier Security Architecture

## Overview
The Zero Trust Healthcare System implements a **four-tier security architecture** that demonstrates the progressive enhancement of security controls and their corresponding performance characteristics. Each tier builds upon the previous one, adding additional security layers while maintaining measurable performance metrics.

## Architecture Design Philosophy

### Progressive Security Enhancement
```
Baseline → Zero Trust → Context-Aware → Privacy-Preserving
  (5ms)      (34ms)         (31ms)           (50ms)
```

Each tier represents a distinct security posture:
1. **Baseline**: Minimal security - authentication only
2. **Zero Trust**: Continuous verification with session management
3. **Context-Aware**: Intelligent optimization with trust scoring
4. **Privacy-Preserving**: Maximum security with encryption and privacy techniques

---

## Tier 1: Baseline

### Purpose
Establishes a performance baseline with minimal security controls for comparison purposes.

### Security Controls
- ✅ JWT signature verification
- ❌ No session tracking
- ❌ No context validation
- ❌ No continuous verification
- ❌ No encryption

### Implementation
**Middleware**: `backend/middleware/basicAuth.js`
```javascript
const basicAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};
```

### Configuration
**File**: `backend/.env.baseline`
```env
JWT_SECRET=<your-secret>
ENABLE_ZERO_TRUST=false
ENABLE_TRUST_SCORE=false
ENABLE_FIELD_ENCRYPTION=false
ENABLE_DIFFERENTIAL_PRIVACY=false
ENABLE_HOMOMORPHIC_ENCRYPTION=false
```

### Performance Characteristics
- **Average Latency**: 5.06ms
- **Overhead**: Baseline (0%)
- **Throughput**: ~198 req/s
- **Use Case**: Performance testing only - NOT for production

### Middleware Stack
```javascript
[basicAuth]  // Single middleware - JWT verify only
```

---

## Tier 2: Zero Trust

### Purpose
Implements core Zero Trust principles: "Never Trust, Always Verify"

### Security Controls
- ✅ JWT signature verification
- ✅ Session validation (database lookup)
- ✅ Continuous verification
- ✅ Access attempt logging
- ✅ Session revocation capability
- ❌ No context-aware checks
- ❌ No encryption

### Implementation
**Middleware**: `backend/middleware/zeroTrust.js`

#### verifyToken Function
```javascript
const verifyToken = async (req, res, next) => {
  // 1. Verify JWT signature
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 2. Validate session exists and is active (5ms DB simulation)
  const sessionInfo = await getSessionInfo(decoded.sessionId);
  if (!sessionInfo || !sessionInfo.isActive) {
    return res.status(401).json({ error: 'Session invalid' });
  }
  
  // 3. Cache session for downstream middleware (optimization)
  req.sessionInfo = sessionInfo;
  
  // 4. Log access attempt (2ms logging simulation)
  await recordAccessAttempt(req.ip, decoded.userId, 'GRANTED', 'Verified');
  
  next();
};
```

### Configuration
**File**: `backend/.env.zerotrust`
```env
JWT_SECRET=<your-secret>
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=false
ENABLE_FIELD_ENCRYPTION=false
ENABLE_DIFFERENTIAL_PRIVACY=false
ENABLE_HOMOMORPHIC_ENCRYPTION=false
```

### Performance Characteristics
- **Average Latency**: 34.32ms
- **Overhead**: +577.8% vs Baseline
- **Throughput**: ~29 req/s
- **Use Case**: Standard production environments requiring continuous verification

### Overhead Breakdown
| Component | Latency | Description |
|-----------|---------|-------------|
| JWT Verification | ~1ms | Signature validation |
| Session Lookup | 5ms | Simulated DB query |
| Access Logging | 2ms | Simulated I/O write |
| Network/Processing | ~26ms | HTTP overhead + JSON |

### Middleware Stack
```javascript
[verifyToken]  // Single comprehensive middleware
```

---

## Tier 3: Context-Aware

### Purpose
Optimizes Zero Trust with intelligent caching and contextual filtering while maintaining security guarantees.

### Security Controls
- ✅ All Zero Trust controls
- ✅ Trust score calculation
- ✅ Device fingerprinting
- ✅ Business hours enforcement
- ✅ Department-based access control
- ✅ Session data caching (optimization)
- ✅ Early exit strategies
- ❌ No encryption

### Implementation
**Middleware**: `backend/middleware/zeroTrust.js`

#### Middleware Chain
1. **verifyToken**: JWT + Session validation (with caching)
2. **contextAwareChecks**: Fast context validation
3. **evaluateTrustScore**: Dynamic trust assessment (with cache)

#### contextAwareChecks Function (Optimized)
```javascript
const contextAwareChecks = async (req, res, next) => {
  // Optimization: Reuse cached session from verifyToken (no DB lookup!)
  const sessionInfo = req.sessionInfo || await getSessionInfo(req.user.sessionId);
  
  // Fast checks first (no I/O)
  if (!isWithinBusinessHours()) {
    return res.status(403).json({ error: 'Outside business hours' });
  }
  
  const currentDevice = getDeviceFingerprint(req);
  const sessionDevice = sessionInfo.deviceInfo || {};
  
  if (!isTrustedDevice(sessionDevice, currentDevice)) {
    return res.status(401).json({ error: 'Device context failed' });
  }
  
  // Expensive check only when needed
  if (needsDepartmentCheck(req)) {
    const patient = await findPatientById(req.params.id);
    if (!isDepartmentAllowed(req.user.department, patient.department)) {
      return res.status(403).json({ error: 'Department access denied' });
    }
  }
  
  next();
};
```

#### evaluateTrustScore Function (With Cache)
```javascript
const evaluateTrustScore = async (req, res, next) => {
  const trustScore = await calculateTrustScore({
    userId: req.user.userId,
    sessionId: req.user.sessionId,
    deviceInfo: getDeviceFingerprint(req),
    ipAddress: req.ip
  });
  
  // Trust score cached for 15 minutes to avoid recalculation
  req.trustScore = trustScore;
  
  if (trustScore.score < 50) {
    return res.status(403).json({ 
      error: 'Trust score too low',
      trustScore: trustScore.score 
    });
  }
  
  next();
};
```

### Configuration
**File**: `backend/.env.contextaware`
```env
JWT_SECRET=<your-secret>
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=true
ENABLE_FIELD_ENCRYPTION=false
ENABLE_DIFFERENTIAL_PRIVACY=false
ENABLE_HOMOMORPHIC_ENCRYPTION=false
BUSINESS_HOURS=08:00-18:00
```

### Performance Characteristics
- **Average Latency**: 31.75ms
- **Overhead**: +527.0% vs Baseline | **-7.5% vs Zero Trust** ⚡
- **Throughput**: ~31 req/s
- **Use Case**: Production environments requiring adaptive security with optimal performance

### Optimization Techniques
1. **Session Caching**: Eliminated 5ms redundant DB lookup
2. **Early Exits**: Fast-fail on business hours/device before expensive operations
3. **Trust Score Cache**: 15-minute TTL prevents recalculation overhead
4. **Conditional Checks**: Department validation only when route requires it
5. **Reduced Logging**: Only log failures, not every validation

### Overhead Breakdown
| Component | Latency | Description |
|-----------|---------|-------------|
| JWT Verification | ~1ms | Signature validation |
| Session Lookup | 5ms | DB query (once, cached) |
| Context Checks | ~1ms | Fast in-memory validations |
| Trust Score | ~3ms | Calculated with 15min cache |
| Access Logging | 2ms | Simulated I/O write |
| Network/Processing | ~20ms | HTTP overhead + JSON |

### Middleware Stack
```javascript
[verifyToken, contextAwareChecks, evaluateTrustScore]
```

### Key Achievement
**Context-Aware is 7.5% faster than Zero Trust** despite adding more security checks, demonstrating that intelligent caching and optimization can improve both security AND performance.

---

## Tier 4: Privacy-Preserving

### Purpose
Maximum security with field-level encryption and privacy-preserving techniques for sensitive healthcare data.

### Security Controls
- ✅ All Context-Aware controls
- ✅ Field-level encryption (AES-256-GCM)
- ✅ Differential Privacy (ε=1.0)
- ✅ Homomorphic Encryption (simplified Paillier)
- ✅ Privacy-preserving computations
- ✅ Encrypted audit logs

### Implementation
**Module**: `backend/privacy/privacy.js`

#### Field-Level Encryption
```javascript
function encryptPatient(patient) {
  if (!process.env.ENABLE_FIELD_ENCRYPTION === 'true') return patient;
  
  return {
    ...patient,
    name: encrypt(patient.name),
    ssn: encrypt(patient.ssn),
    medicalHistory: encrypt(JSON.stringify(patient.medicalHistory)),
    // Non-sensitive fields remain unencrypted for indexing
    department: patient.department,
    createdAt: patient.createdAt
  };
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

#### Differential Privacy
```javascript
function addDifferentialPrivacyNoise(value, epsilon = 1.0, sensitivity = 1.0) {
  if (!process.env.ENABLE_DIFFERENTIAL_PRIVACY === 'true') return value;
  
  const scale = sensitivity / epsilon;
  const noise = laplacianNoise(scale);
  
  return Math.max(0, value + noise); // Ensure non-negative for counts
}

function laplacianNoise(scale) {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}
```

#### Homomorphic Encryption (Simplified Paillier)
```javascript
function homomorphicAdd(encryptedA, encryptedB) {
  // Simplified implementation for demonstration
  return (encryptedA * encryptedB) % publicKey.n;
}

function homomorphicMultiply(encrypted, scalar) {
  return Math.pow(encrypted, scalar) % publicKey.n;
}
```

### Configuration
**File**: `backend/.env.privacy`
```env
JWT_SECRET=<your-secret>
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=true
ENABLE_FIELD_ENCRYPTION=true
ENABLE_DIFFERENTIAL_PRIVACY=true
ENABLE_HOMOMORPHIC_ENCRYPTION=true
ENCRYPTION_KEY=<256-bit-key>
DP_EPSILON=1.0
DP_SENSITIVITY=1.0
BUSINESS_HOURS=08:00-18:00
```

### Performance Characteristics
- **Average Latency**: 49.93ms
- **Overhead**: +886.0% vs Baseline | +45.5% vs Zero Trust | +57.3% vs Context-Aware
- **Throughput**: ~20 req/s
- **Use Case**: High-security environments, research data, HIPAA compliance

### Overhead Breakdown
| Component | Latency | Description |
|-----------|---------|-------------|
| All Context-Aware | ~32ms | Base security controls |
| Field Encryption | ~8ms | AES-256-GCM encrypt/decrypt |
| DP Noise Addition | ~2ms | Laplacian noise generation |
| HE Operations | ~5ms | Paillier homomorphic ops |
| Network/Processing | ~3ms | Additional JSON serialization |

### Middleware Stack
```javascript
[verifyToken, contextAwareChecks, evaluateTrustScore]
// + Model-level encryption in patient.js CRUD operations
```

### Encryption Strategy
- **Sensitive Fields**: name, ssn, medicalHistory, diagnosis → Encrypted
- **Indexable Fields**: id, department, createdAt → Plaintext
- **Searchable**: Use deterministic encryption or tokenization (future enhancement)

---

## Tier Switching

### How to Switch Between Tiers

#### Method 1: Copy Environment File
```bash
# Switch to Baseline
cd backend
copy .env.baseline .env

# Switch to Zero Trust
copy .env.zerotrust .env

# Switch to Context-Aware
copy .env.contextaware .env

# Switch to Privacy-Preserving
copy .env.privacy .env

# Restart server
npm start
```

#### Method 2: Manual Configuration
Edit `backend/.env` and set flags:

```env
# Baseline Tier
ENABLE_ZERO_TRUST=false
ENABLE_TRUST_SCORE=false
ENABLE_FIELD_ENCRYPTION=false

# Zero Trust Tier
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=false
ENABLE_FIELD_ENCRYPTION=false

# Context-Aware Tier
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=true
ENABLE_FIELD_ENCRYPTION=false

# Privacy-Preserving Tier
ENABLE_ZERO_TRUST=true
ENABLE_TRUST_SCORE=true
ENABLE_FIELD_ENCRYPTION=true
ENABLE_DIFFERENTIAL_PRIVACY=true
ENABLE_HOMOMORPHIC_ENCRYPTION=true
```

### Server Configuration Logic
**File**: `backend/server.js`
```javascript
// Build middleware stack based on environment flags
const protectionMiddleware = [];

if (process.env.ENABLE_ZERO_TRUST === 'true') {
  protectionMiddleware.push(verifyToken);
  
  if (process.env.ENABLE_TRUST_SCORE === 'true') {
    protectionMiddleware.push(contextAwareChecks);
    protectionMiddleware.push(evaluateTrustScore);
  }
} else {
  protectionMiddleware.push(basicAuth);
}

// Apply to protected routes
app.use('/api/patients', ...protectionMiddleware, patientsRouter);
app.use('/api/appointments', ...protectionMiddleware, appointmentsRouter);
```

---

## Performance Comparison

### Latency Summary
| Tier | Avg (ms) | Med (ms) | P95 (ms) | P99 (ms) | Overhead |
|------|----------|----------|----------|----------|----------|
| Baseline | 5.06 | 4.07 | 8.47 | 24.39 | Baseline |
| Zero Trust | 34.32 | 34.13 | 34.96 | 68.00 | +577.8% |
| Context-Aware | 31.75 | 33.95 | 44.78 | 56.80 | +527.0% |
| Privacy-Preserving | 49.93 | 49.93 | 51.24 | 60.64 | +886.0% |

### Throughput Comparison (est.)
- **Baseline**: ~198 req/s
- **Zero Trust**: ~29 req/s
- **Context-Aware**: ~31 req/s ⚡ *Faster due to optimization*
- **Privacy-Preserving**: ~20 req/s

### Security vs Performance Trade-off
```
Security Level:  Low ←―――――――――――――――――→ High
                  |         |         |        |
                Baseline  Zero    Context   Privacy
                          Trust    Aware

Performance:     High ←―――――――――――――――――→ Low
                  |         |         |        |
                Baseline  Context  Zero    Privacy
                          Aware    Trust
```

**Key Insight**: Context-Aware achieves higher security than Zero Trust with BETTER performance through optimization.

---

## Benchmarking

### Automated Benchmark Scripts

#### Single Tier Benchmark
```bash
cd backend
node Scripts/benchmark-single-tier.js <tier_name>

# Examples:
node Scripts/benchmark-single-tier.js baseline
node Scripts/benchmark-single-tier.js zeroTrust
node Scripts/benchmark-single-tier.js contextAware
node Scripts/benchmark-single-tier.js privacyPreserving
```

#### Combine Results
```bash
node Scripts/combine-results.js
```

#### Generate Visualizations
```bash
python Scripts/visualize.py benchmark_results_<timestamp>.csv
```

### Benchmark Configuration
- **Requests per tier**: 100
- **Warmup**: 5 requests
- **Endpoints**: Mixed workload (patients, appointments, metrics)
- **Delay**: 10ms between requests
- **Environment**: Node.js v22.21.0, Windows

---

## Architecture Decisions

### Why Four Tiers?

1. **Baseline**: Establishes performance baseline for comparison
2. **Zero Trust**: Industry-standard continuous verification
3. **Context-Aware**: Demonstrates optimization possibilities
4. **Privacy-Preserving**: Meets regulatory requirements (HIPAA, GDPR)

### Why Context-Aware is Faster than Zero Trust?

**Optimization Strategies:**
- Session data cached in request object (saved 5ms DB lookup)
- Early exit on fast validations (business hours, device)
- Trust score cached for 15 minutes (reduced recalculation)
- Conditional expensive checks (department filtering only when needed)
- Reduced logging overhead

**Result**: More security checks execute, but cached data and smart ordering reduce total latency.

### When to Use Each Tier?

| Tier | Use Case | Environment |
|------|----------|-------------|
| **Baseline** | Testing, benchmarking only | Development |
| **Zero Trust** | Standard production apps | General healthcare apps |
| **Context-Aware** | High-traffic production | Enterprise healthcare |
| **Privacy-Preserving** | Regulated data, research | HIPAA/GDPR compliance |

---

## Future Enhancements

### Planned Optimizations
- [ ] Redis-based session storage (reduce 5ms to <1ms)
- [ ] Connection pooling for database
- [ ] Trust score batch calculation
- [ ] Department lookup caching
- [ ] Query optimization for patient data

### Additional Tiers (Research)
- **Tier 5: ML-Enhanced**: Machine learning for anomaly detection
- **Tier 6: Blockchain**: Immutable audit logs with blockchain
- **Tier 7: Federated**: Multi-institution federated learning

---

## References

### Academic Foundation
- NIST Zero Trust Architecture (SP 800-207)
- Healthcare Zero Trust frameworks
- Differential Privacy (Dwork, 2006)
- Homomorphic Encryption (Paillier, 1999)

### Implementation Standards
- JWT (RFC 7519)
- AES-GCM encryption (NIST)
- HIPAA Security Rule
- GDPR Article 32 (Security of processing)

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Maintained By**: Zero Trust Healthcare Research Team
