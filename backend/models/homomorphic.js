// backend/models/homomorphic.js
// Privacy-Preserving Layer 3: Homomorphic Encryption (Simplified)
// Uses additive homomorphic properties for trust score calculation

const crypto = require('crypto');

/**
 * Simplified Homomorphic Encryption for Trust Score Calculation
 * 
 * This is a DEMONSTRATION implementation showing the concept.
 * For production, use libraries like 'node-paillier' or 'SEAL.js'
 * 
 * Mathematical Property (Additive Homomorphism):
 * E(a) + E(b) = E(a + b)
 * 
 * This allows computing sum of encrypted values without decryption!
 */

class SimplifiedPaillier {
  constructor() {
    // In real Paillier, these would be large primes (1024+ bits)
    // For demo, using smaller values for performance
    this.keySize = 512; // bits
    this.n = null;  // Modulus (n = p * q)
    this.g = null;  // Generator
    this.lambda = null; // Private key component
    this.mu = null; // Private key component
    
    this.generateKeys();
  }

  /**
   * Generate public/private key pair
   * Real implementation would use proper RSA key generation
   */
  generateKeys() {
    const startTime = Date.now();
    
    // Simplified key generation (not cryptographically secure for production!)
    // In production: use node-forge or similar for proper prime generation
    const p = this.generatePrime(256);
    const q = this.generatePrime(256);
    
    this.n = p * q;
    this.g = this.n + 1n; // Simplified generator
    this.lambda = (p - 1n) * (q - 1n);
    
    // Calculate mu = (L(g^lambda mod n^2))^-1 mod n
    // Simplified: just use inverse of lambda for demo
    this.mu = this.modInverse(this.lambda, this.n);
    
    const duration = Date.now() - startTime;
    recordHEMetric('key_generation', duration);
  }

  /**
   * Generate a pseudo-prime (for demo purposes only!)
   */
  generatePrime(bits) {
    // This is NOT a secure prime generator - for demo only!
    const bytes = Math.ceil(bits / 8);
    const buffer = crypto.randomBytes(bytes);
    let num = BigInt('0x' + buffer.toString('hex'));
    
    // Make it odd
    num = num | 1n;
    
    // Basic primality test (not secure!)
    while (!this.isProbablyPrime(num, 5)) {
      num += 2n;
    }
    
    return num;
  }

  /**
   * Miller-Rabin primality test (simplified)
   */
  isProbablyPrime(n, k = 5) {
    if (n < 2n) return false;
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n) return false;

    // Write n-1 as 2^r * d
    let d = n - 1n;
    let r = 0n;
    while (d % 2n === 0n) {
      d /= 2n;
      r++;
    }

    // Witness loop
    for (let i = 0; i < k; i++) {
      const a = this.randomBigInt(2n, n - 2n);
      let x = this.modPow(a, d, n);

      if (x === 1n || x === n - 1n) continue;

      let continueWitnessLoop = false;
      for (let j = 0n; j < r - 1n; j++) {
        x = this.modPow(x, 2n, n);
        if (x === n - 1n) {
          continueWitnessLoop = true;
          break;
        }
      }

      if (!continueWitnessLoop) return false;
    }

    return true;
  }

  randomBigInt(min, max) {
    const range = max - min;
    const bits = range.toString(2).length;
    const bytes = Math.ceil(bits / 8);
    let result;
    
    do {
      const buffer = crypto.randomBytes(bytes);
      result = BigInt('0x' + buffer.toString('hex')) % range;
    } while (result < 0n);
    
    return min + result;
  }

  modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) result = (result * base) % mod;
      exp = exp / 2n;
      base = (base * base) % mod;
    }
    return result;
  }

  modInverse(a, m) {
    // Extended Euclidean Algorithm
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
      const quotient = old_r / r;
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
    }

    return old_s < 0n ? old_s + m : old_s;
  }

  /**
   * Encrypt a value
   * @param {number} plaintext - Value to encrypt
   * @returns {string} - Encrypted value (as hex string)
   */
  encrypt(plaintext) {
    const startTime = Date.now();
    
    const m = BigInt(Math.round(plaintext));
    const n2 = this.n * this.n;
    
    // r = random in Z*n
    const r = this.randomBigInt(1n, this.n);
    
    // c = g^m * r^n mod n^2
    const gm = this.modPow(this.g, m, n2);
    const rn = this.modPow(r, this.n, n2);
    const c = (gm * rn) % n2;
    
    const duration = Date.now() - startTime;
    recordHEMetric('encryption', duration);
    
    return c.toString(16);
  }

  /**
   * Decrypt a value
   * @param {string} ciphertext - Encrypted value (hex string)
   * @returns {number} - Decrypted plaintext
   */
  decrypt(ciphertext) {
    const startTime = Date.now();
    
    const c = BigInt('0x' + ciphertext);
    const n2 = this.n * this.n;
    
    // m = L(c^lambda mod n^2) * mu mod n
    const cl = this.modPow(c, this.lambda, n2);
    const l = this.L(cl);
    const m = (l * this.mu) % this.n;
    
    const duration = Date.now() - startTime;
    recordHEMetric('decryption', duration);
    
    return Number(m);
  }

  /**
   * L function: L(x) = (x-1)/n
   */
  L(x) {
    return (x - 1n) / this.n;
  }

  /**
   * Homomorphic Addition
   * E(a) + E(b) = E(a + b)
   * @param {string} c1 - Encrypted value 1
   * @param {string} c2 - Encrypted value 2
   * @returns {string} - Encrypted sum
   */
  add(c1, c2) {
    const startTime = Date.now();
    
    const cipher1 = BigInt('0x' + c1);
    const cipher2 = BigInt('0x' + c2);
    const n2 = this.n * this.n;
    
    // Homomorphic addition: c1 * c2 mod n^2
    const result = (cipher1 * cipher2) % n2;
    
    const duration = Date.now() - startTime;
    recordHEMetric('homomorphic_add', duration);
    
    return result.toString(16);
  }

  /**
   * Homomorphic Scalar Multiplication
   * k * E(a) = E(k * a)
   * @param {string} ciphertext - Encrypted value
   * @param {number} scalar - Scalar multiplier
   * @returns {string} - Encrypted result
   */
  multiply(ciphertext, scalar) {
    const startTime = Date.now();
    
    const c = BigInt('0x' + ciphertext);
    const k = BigInt(Math.round(scalar));
    const n2 = this.n * this.n;
    
    // Scalar multiplication: c^k mod n^2
    const result = this.modPow(c, k, n2);
    
    const duration = Date.now() - startTime;
    recordHEMetric('homomorphic_multiply', duration);
    
    return result.toString(16);
  }
}

// Global instance (in production, manage per-session or per-user)
let paillierInstance = null;

function getPaillierInstance() {
  if (!paillierInstance) {
    paillierInstance = new SimplifiedPaillier();
  }
  return paillierInstance;
}

/**
 * Calculate trust score using homomorphic encryption
 * Demonstrates computing on encrypted data
 */
async function calculateEncryptedTrustScore(factors) {
  const startTime = Date.now();
  const he = getPaillierInstance();
  
  // Encrypt each factor score
  const encryptedFactors = {};
  const weights = {
    sessionHealth: 0.25,
    authTrackRecord: 0.20,
    deviceConsistency: 0.15,
    accessPattern: 0.15,
    contextCompliance: 0.15,
    roleRisk: 0.10
  };
  
  for (const [factor, value] of Object.entries(factors)) {
    encryptedFactors[factor] = he.encrypt(value);
  }
  
  // Perform homomorphic operations (weighted sum)
  let encryptedSum = he.encrypt(0); // Start with E(0)
  
  for (const [factor, encryptedValue] of Object.entries(encryptedFactors)) {
    const weight = weights[factor] || 0;
    // Multiply encrypted value by weight: E(value) * weight = E(value * weight)
    const weightedEncrypted = he.multiply(encryptedValue, weight * 100); // Scale by 100 for precision
    // Add to running sum: E(sum) + E(weighted) = E(sum + weighted)
    encryptedSum = he.add(encryptedSum, weightedEncrypted);
  }
  
  // Only decrypt the final result!
  const trustScore = Math.round(he.decrypt(encryptedSum) / 100); // Unscale
  
  const duration = Date.now() - startTime;
  recordHEMetric('trust_score_calculation', duration);
  
  return {
    trustScore: Math.max(0, Math.min(100, trustScore)),
    encryptedFactors,
    encryptedSum,
    computationTime: duration,
    note: 'Trust score computed on encrypted data using homomorphic encryption'
  };
}

// Metrics tracking
const heMetrics = {
  key_generation: { count: 0, totalTime: 0 },
  encryption: { count: 0, totalTime: 0 },
  decryption: { count: 0, totalTime: 0 },
  homomorphic_add: { count: 0, totalTime: 0 },
  homomorphic_multiply: { count: 0, totalTime: 0 },
  trust_score_calculation: { count: 0, totalTime: 0 }
};

function recordHEMetric(operation, duration) {
  if (heMetrics[operation]) {
    heMetrics[operation].count++;
    heMetrics[operation].totalTime += duration;
  }
}

function getHEMetrics() {
  const result = {};
  for (const [operation, data] of Object.entries(heMetrics)) {
    result[operation] = {
      count: data.count,
      totalTime: data.totalTime,
      avgTime: data.count > 0 ? (data.totalTime / data.count).toFixed(2) : 0
    };
  }
  return result;
}

module.exports = {
  SimplifiedPaillier,
  getPaillierInstance,
  calculateEncryptedTrustScore,
  getHEMetrics
};