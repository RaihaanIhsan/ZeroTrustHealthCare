const axios = require('axios');

async function demoTrustDrop() {
  console.log('🎬 Starting Trust Score Demo...\n');
  
  // Step 1: Failed logins
  console.log('1️⃣ Simulating 5 failed login attempts...');
  for (let i = 0; i < 5; i++) {
    await axios.post('http://localhost:5000/api/auth/login', {
      username: 'doctor1',
      password: 'wrong'
    }).catch(() => {});
  }
  console.log('✅ Failed logins recorded\n');
  
  // Step 2: Login successfully
  console.log('2️⃣ Logging in with correct credentials...');
  const login = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'doctor1',
    password: 'doctor123'
  });
  const token = login.data.token;
  console.log('✅ Logged in successfully\n');
  
  // Step 3: Burst requests
  console.log('3️⃣ Sending 50 burst requests...');
  const bursts = Array(50).fill().map(() =>
    axios.get('http://localhost:5000/api/patients', {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  );
  await Promise.all(bursts);
  console.log('✅ Burst requests completed\n');
  
  // Step 4: Check trust score
  console.log('4️⃣ Checking trust score...');
  const trust = await axios.get('http://localhost:5000/api/metrics/trust-score', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('\n📊 TRUST SCORE RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎯 Score: ${trust.data.trustScore}/100`);
  console.log(`🚦 Action: ${trust.data.action}`);
  console.log(`📝 Reason: ${trust.data.reason}\n`);
  console.log('Factor Breakdown:');
  Object.entries(trust.data.factors).forEach(([key, value]) => {
    const bar = '█'.repeat(Math.floor(value / 5));
    console.log(`  ${key.padEnd(20)}: ${bar} ${value}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎬 Demo complete! Refresh the dashboard to see the low trust score.');
}

demoTrustDrop();