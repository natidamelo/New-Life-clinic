// Quick Fix for 401 Authentication Error
// Run this in the browser console on your main application

console.log('🔧 Quick Fix for 401 Authentication Error');

// Step 1: Login and get token
async function quickLogin() {
    try {
        console.log('Logging in...');
        
        const response = await fetch('http://192.168.78.157:5002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@clinic.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Login successful!');
            
            // Step 2: Set token in all possible locations
            const token = data.token;
            const userData = data.user;
            
            // Set in localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('AUTH_TOKEN_KEY', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('clinic_auth_token', token);
            localStorage.setItem('clinic_jwt_token', token);
            
            // Set user data
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            console.log('✅ Auth token set in all locations');
            console.log('User:', userData.name, 'Role:', userData.role);
            
            // Step 3: Test the billing API
            await testBillingAPI(token);
            
            // Step 4: Reload the page
            console.log('🔄 Reloading page to apply changes...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            console.error('❌ Login failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
    }
}

// Test the billing API
async function testBillingAPI(token) {
    try {
        console.log('Testing billing API...');
        
        const response = await fetch('http://192.168.78.157:5002/api/billing/unpaid-card-payments', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Billing API working!');
            console.log('Response:', data);
        } else {
            console.error('❌ Billing API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

// Auto-run the fix
quickLogin(); 
 
// Run this in the browser console on your main application

console.log('🔧 Quick Fix for 401 Authentication Error');

// Step 1: Login and get token
async function quickLogin() {
    try {
        console.log('Logging in...');
        
        const response = await fetch('http://192.168.78.157:5002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@clinic.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Login successful!');
            
            // Step 2: Set token in all possible locations
            const token = data.token;
            const userData = data.user;
            
            // Set in localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('AUTH_TOKEN_KEY', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('clinic_auth_token', token);
            localStorage.setItem('clinic_jwt_token', token);
            
            // Set user data
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            console.log('✅ Auth token set in all locations');
            console.log('User:', userData.name, 'Role:', userData.role);
            
            // Step 3: Test the billing API
            await testBillingAPI(token);
            
            // Step 4: Reload the page
            console.log('🔄 Reloading page to apply changes...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            console.error('❌ Login failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
    }
}

// Test the billing API
async function testBillingAPI(token) {
    try {
        console.log('Testing billing API...');
        
        const response = await fetch('http://192.168.78.157:5002/api/billing/unpaid-card-payments', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Billing API working!');
            console.log('Response:', data);
        } else {
            console.error('❌ Billing API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

// Auto-run the fix
quickLogin(); 
 
 
 
 
 
 
// Run this in the browser console on your main application

console.log('🔧 Quick Fix for 401 Authentication Error');

// Step 1: Login and get token
async function quickLogin() {
    try {
        console.log('Logging in...');
        
        const response = await fetch('http://192.168.78.157:5002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@clinic.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Login successful!');
            
            // Step 2: Set token in all possible locations
            const token = data.token;
            const userData = data.user;
            
            // Set in localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('AUTH_TOKEN_KEY', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('clinic_auth_token', token);
            localStorage.setItem('clinic_jwt_token', token);
            
            // Set user data
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            console.log('✅ Auth token set in all locations');
            console.log('User:', userData.name, 'Role:', userData.role);
            
            // Step 3: Test the billing API
            await testBillingAPI(token);
            
            // Step 4: Reload the page
            console.log('🔄 Reloading page to apply changes...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            console.error('❌ Login failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
    }
}

// Test the billing API
async function testBillingAPI(token) {
    try {
        console.log('Testing billing API...');
        
        const response = await fetch('http://192.168.78.157:5002/api/billing/unpaid-card-payments', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Billing API working!');
            console.log('Response:', data);
        } else {
            console.error('❌ Billing API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

// Auto-run the fix
quickLogin(); 
 
// Run this in the browser console on your main application

console.log('🔧 Quick Fix for 401 Authentication Error');

// Step 1: Login and get token
async function quickLogin() {
    try {
        console.log('Logging in...');
        
        const response = await fetch('http://192.168.78.157:5002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@clinic.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Login successful!');
            
            // Step 2: Set token in all possible locations
            const token = data.token;
            const userData = data.user;
            
            // Set in localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('AUTH_TOKEN_KEY', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('clinic_auth_token', token);
            localStorage.setItem('clinic_jwt_token', token);
            
            // Set user data
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            console.log('✅ Auth token set in all locations');
            console.log('User:', userData.name, 'Role:', userData.role);
            
            // Step 3: Test the billing API
            await testBillingAPI(token);
            
            // Step 4: Reload the page
            console.log('🔄 Reloading page to apply changes...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            console.error('❌ Login failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
    }
}

// Test the billing API
async function testBillingAPI(token) {
    try {
        console.log('Testing billing API...');
        
        const response = await fetch('http://192.168.78.157:5002/api/billing/unpaid-card-payments', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Billing API working!');
            console.log('Response:', data);
        } else {
            console.error('❌ Billing API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

// Auto-run the fix
quickLogin(); 
 
 
 
 
 
 