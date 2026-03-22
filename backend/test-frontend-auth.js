const http = require('http');

// Test the authentication flow
async function testAuth() {
  try {
    console.log('🔐 Testing authentication flow...');
    
    // Step 1: Test login
    const loginData = JSON.stringify({
      identifier: 'reception@test.com',
      password: 'password123'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 5002,
      path: '/api/auth/test-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (error) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.write(loginData);
      req.end();
    });
    
    console.log('Login response:', loginResponse);
    
    if (loginResponse.statusCode === 200 && loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('✅ Authentication successful! Token:', token.substring(0, 20) + '...');
      
      // Step 2: Test notifications with authentication
      const notificationOptions = {
        hostname: 'localhost',
        port: 5002,
        path: '/api/notifications?recipientRole=reception&read=false',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const notificationResponse = await new Promise((resolve, reject) => {
        const req = http.request(notificationOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: jsonData });
            } catch (error) {
              resolve({ statusCode: res.statusCode, data: data });
            }
          });
        });
        
        req.on('error', (err) => {
          reject(err);
        });
        
        req.end();
      });
      
      console.log('\n📋 Notifications response:', notificationResponse);
      
      if (notificationResponse.statusCode === 200 && notificationResponse.data.success) {
        const notifications = notificationResponse.data.data || [];
        const labNotifications = notifications.filter(n => n.type === 'lab_payment_required');
        
        console.log(`\n✅ Successfully fetched ${notifications.length} notifications`);
        console.log(`🔬 Found ${labNotifications.length} lab payment notifications`);
        
        labNotifications.forEach((notification, index) => {
          console.log(`\n--- Lab Notification ${index + 1} ---`);
          console.log('Patient:', notification.data?.patientName);
          console.log('Amount:', notification.data?.amount);
          console.log('Payment Status:', notification.data?.paymentStatus);
          console.log('Read:', notification.read);
        });
      } else {
        console.log('❌ Failed to fetch notifications:', notificationResponse);
      }
      
    } else {
      console.log('❌ Authentication failed:', loginResponse);
    }
    
  } catch (error) {
    console.error('Error testing authentication:', error);
  }
}

testAuth(); 