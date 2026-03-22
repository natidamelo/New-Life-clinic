# Fix for Notify-Doctor 404 Error

## Problem
The frontend is getting a 404 error when trying to access `/api/patients/687ba661855f0fa1564c6d06/notify-doctor`. The actual issue is that the route exists but authentication is failing, causing a 500 error.

## Root Cause
1. The notify-doctor route requires authentication (`protect` middleware)
2. The frontend is not sending a valid authentication token
3. The test-login endpoint is failing with 500 errors
4. The frontend needs to be properly logged in

## Solution Steps

### 1. Fix Authentication System

The test-login endpoint is failing. Check the server logs for the specific error. The issue might be:
- Missing dependencies in authService.js
- Database connection issues
- JWT configuration problems

### 2. Test Authentication Manually

Try logging in with a known user:
```bash
curl -X POST http://localhost:5175/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "nurse@clinic.com", "password": "nurse123"}'
```

### 3. Ensure Frontend is Logged In

The frontend needs to be logged in with a valid token. Check:
- Browser localStorage for auth token
- Frontend authentication state
- Network requests for authentication headers

### 4. Test the Route with Authentication

Once authentication is working, test the route with a valid token:
```bash
curl -X POST http://localhost:5175/api/patients/687ba661855f0fa1564c6d06/notify-doctor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Test notification", "type": "vitals_update"}'
```

### 5. Debug Authentication Issues

If the test-login endpoint is still failing:
1. Check server logs for specific error messages
2. Verify database connection
3. Check JWT configuration
4. Ensure all required dependencies are installed

### 6. Alternative: Temporary Authentication Bypass

For testing purposes, you can temporarily disable authentication:
```javascript
// In backend/routes/patients.js
router.post('/:id/notify-doctor', [
  // protect,  // Comment out temporarily
  // checkRole('nurse'),  // Comment out temporarily
  body('message').notEmpty()
], async (req, res) => {
  // ... route handler
});
```

## Expected Behavior

Once fixed:
1. Frontend should be able to log in successfully
2. Authentication token should be stored in localStorage
3. API requests should include the Authorization header
4. The notify-doctor route should work without 404/500 errors

## Files to Check

1. `backend/routes/patients.js` - notify-doctor route
2. `backend/routes/auth.js` - test-login endpoint
3. `backend/services/authService.js` - authentication logic
4. `frontend/src/services/authService.js` - frontend authentication
5. `frontend/src/config/axios.ts` - API configuration

## Test Commands

```bash
# Test health check
curl http://localhost:5175/api/health-check

# Test authentication
curl -X POST http://localhost:5175/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "nurse@clinic.com", "password": "nurse123"}'

# Test notify-doctor route (without auth)
curl -X POST http://localhost:5175/api/patients/687ba661855f0fa1564c6d06/notify-doctor \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
``` 