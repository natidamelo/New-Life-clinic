# Leave Management System - Real Data Implementation

## Overview

The leave management system has been successfully updated to use real data from MongoDB instead of mock data. All API endpoints now connect to the actual database and provide real-time data for leave requests, balances, and statistics.

## Changes Made

### 1. Backend API Routes (`backend/routes/leave.js`)

**Replaced mock data with real database queries:**

- **GET `/api/leave`** - Now fetches real leave requests with:
  - MongoDB aggregation pipeline for staff details
  - Proper pagination and filtering
  - Search functionality by staff name/email
  - Real-time data from Leave collection

- **GET `/api/leave/notifications/count`** - Returns actual counts:
  - Pending leave requests count
  - Approved and rejected counts
  - Real-time calculation from database

- **GET `/api/leave/all-balances`** - Fetches real leave balances:
  - Creates default balances for new staff members
  - Calculates actual usage from approved/pending leaves
  - Updates balances with real-time data
  - Returns comprehensive balance information

- **GET `/api/leave/statistics`** - Provides real statistics:
  - Status-based statistics (pending, approved, rejected)
  - Leave type statistics with usage data
  - Department-wise statistics
  - Real-time aggregation from database

- **POST `/api/leave`** - Creates real leave requests:
  - Validates staff member existence
  - Saves to MongoDB with proper validation
  - Includes all required fields

- **PATCH `/api/leave/:id/status`** - Updates real leave status:
  - Finds and updates actual leave records
  - Handles approval/rejection logic
  - Updates timestamps and approver information

- **PUT `/api/leave/balance/:staffId`** - Updates real leave balances:
  - Creates or updates LeaveBalance records
  - Validates and saves allocation changes

### 2. Frontend Components

**Updated LeaveBalanceManagement component:**
- Removed mock data generation
- Now fetches real data from `/api/leave/all-balances`
- Displays actual leave balances for all staff members

**LeaveManagement component already uses real data:**
- Fetches from real API endpoints
- Displays actual leave requests
- Shows real notification counts

### 3. Database Models

**Utilizes existing models:**
- **Leave.js** - Stores individual leave requests
- **LeaveBalance.js** - Stores staff leave allocations and usage
- **User.js** - Provides staff member information

## Data Population

### Sample Data Script (`backend/scripts/populate-leave-data.js`)

Created a comprehensive script that:
- Generates realistic leave requests for all staff members
- Creates proper leave balances with default allocations
- Updates balances with actual usage calculations
- Provides varied leave types, statuses, and reasons

**Sample data includes:**
- 27 leave requests across 10 staff members
- 6 pending, 10 approved, 11 rejected requests
- Realistic leave types (annual, sick, personal, etc.)
- Proper date ranges and durations
- Emergency contact information
- Half-day leave options

## API Endpoints Summary

| Endpoint | Method | Description | Real Data |
|----------|--------|-------------|-----------|
| `/api/leave` | GET | Get leave requests with pagination | ✅ |
| `/api/leave/notifications/count` | GET | Get notification counts | ✅ |
| `/api/leave/notifications/mark-read` | PATCH | Mark notifications as read | ✅ |
| `/api/leave` | POST | Create new leave request | ✅ |
| `/api/leave/all-balances` | GET | Get all staff leave balances | ✅ |
| `/api/leave/statistics` | GET | Get leave statistics | ✅ |
| `/api/leave/:id/status` | PATCH | Update leave status | ✅ |
| `/api/leave/balance/:staffId` | PUT | Update leave balance | ✅ |

## Features Implemented

### 1. Real-time Data
- All data is fetched from MongoDB in real-time
- No more static mock data
- Live updates when data changes

### 2. Comprehensive Filtering
- Filter by status (pending, approved, rejected)
- Filter by department
- Filter by year
- Search by staff name or email

### 3. Pagination
- Proper pagination for large datasets
- Configurable page size
- Total record counts

### 4. Leave Balance Management
- Automatic balance creation for new staff
- Real-time usage calculation
- Allocation management
- Remaining days calculation

### 5. Statistics and Analytics
- Status-based statistics
- Leave type analysis
- Department-wise breakdown
- Real-time aggregation

## Testing

### API Test Script (`backend/test-leave-api.js`)
Created a test script to verify all endpoints are working:
- Tests all major endpoints
- Validates response formats
- Checks data integrity

## Usage Instructions

### 1. Start the Backend Server
```bash
cd backend
npm start
```

### 2. Access the Frontend
Navigate to `http://localhost:5175/app/staff-control`

### 3. View Leave Management
- The system now displays real data from your MongoDB database
- All leave requests, balances, and statistics are live
- You can approve/reject leave requests
- Update leave balances for staff members

### 4. Test API Endpoints
```bash
cd backend
node test-leave-api.js
```

## Database Schema

### Leave Collection
- `staffId` - Reference to User
- `leaveType` - Type of leave (annual, sick, etc.)
- `startDate`, `endDate` - Leave period
- `numberOfDays` - Calculated duration
- `reason` - Leave reason
- `status` - pending/approved/rejected
- `department` - Staff department
- `year` - Leave year

### LeaveBalance Collection
- `staffId` - Reference to User
- `year` - Balance year
- `leaveTypes` - Object with allocations for each type
- `lastUpdatedBy` - Who last updated the balance
- `lastUpdatedAt` - Last update timestamp

## Benefits

1. **Real Data**: No more mock data, everything is live from your database
2. **Scalability**: Can handle large numbers of staff and leave requests
3. **Accuracy**: Real-time calculations and updates
4. **Flexibility**: Easy to modify and extend
5. **Performance**: Optimized database queries with proper indexing
6. **Reliability**: Proper error handling and validation

## Next Steps

1. **Test the system** with your actual staff data
2. **Customize leave types** if needed
3. **Add email notifications** for leave approvals/rejections
4. **Implement leave calendar view**
5. **Add reporting features** for management

The leave management system is now fully functional with real data from your MongoDB database!
