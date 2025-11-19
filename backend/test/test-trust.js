const axios = require('axios');

async function simulateFailedLogins() {
  console.log('Simulating failed login attempts...');
  
  for (let i = 0; i < 5; i++) {
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        username: 'admin',
        password: 'wrongpassword123'
      });
    } catch (error) {
      console.log(`Failed attempt ${i + 1}/5`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Done! Now login normally and check trust score.');
}

simulateFailedLogins();