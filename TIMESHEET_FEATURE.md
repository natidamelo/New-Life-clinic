# Timesheet Management System

## Overview

The Timesheet Management System is a comprehensive solution for tracking staff attendance, work hours, and break management in the clinic management system. It provides both admin and staff interfaces for managing daily attendance records.

## Features

### 🕐 Staff Features
- **Clock In/Out**: Easy-to-use interface for staff to clock in and out
- **Break Management**: Start and end breaks (lunch, coffee, personal)
- **Real-time Tracking**: Live clock display and work duration calculation
- **Notes**: Add notes to clock-in/out events
- **Daily Summary**: View today's attendance summary

### 👨‍💼 Admin Features
- **Timesheet Dashboard**: Comprehensive overview of all staff timesheets
- **Approval System**: Approve or reject timesheets with notes
- **Advanced Filtering**: Filter by date range, department, status
- **Statistics**: Detailed analytics and reporting
- **Export**: Export timesheet data (planned feature)

### 📊 Analytics & Reporting
- **Overall Statistics**: Total work hours, break hours, average metrics
- **Department Performance**: Department-wise work hour analysis
- **Status Distribution**: Timesheet status breakdown
- **Real-time Updates**: Live data updates

## Technical Implementation

### Backend Components

#### 1. Timesheet Model (`backend/models/Timesheet.js`)
```javascript
// Key features:
- User association and department tracking
- Clock in/out with location and method
- Break management with types (lunch, coffee, personal, other)
- Automatic work hour calculations
- Status tracking (active, completed, approved, rejected)
- Approval workflow with admin notes
```

#### 2. Timesheet Routes (`backend/routes/timesheets.js`)
```javascript
// Available endpoints:
GET    /api/timesheets              # Get all timesheets (admin)
GET    /api/timesheets/user/:userId # Get user timesheets
GET    /api/timesheets/today        # Get today's timesheet
POST   /api/timesheets/clock-in     # Clock in
POST   /api/timesheets/clock-out    # Clock out
POST   /api/timesheets/break/start  # Start break
POST   /api/timesheets/break/end    # End break
PATCH  /api/timesheets/:id/approve  # Approve timesheet
PATCH  /api/timesheets/:id/reject   # Reject timesheet
GET    /api/timesheets/stats        # Get statistics
```

### Frontend Components

#### 1. Timesheet Service (`frontend/src/services/timesheetService.ts`)
- Complete API integration
- Helper methods for formatting and calculations
- TypeScript interfaces for type safety

#### 2. Clock In/Out Component (`frontend/src/components/Timesheet/ClockInOut.tsx`)
- Real-time clock display
- Interactive clock in/out buttons
- Break management interface
- Daily summary display

#### 3. Timesheet Dashboard (`frontend/src/components/Timesheet/TimesheetDashboard.tsx`)
- Admin dashboard with statistics
- Advanced filtering and search
- Timesheet approval interface
- Pagination support

#### 4. Timesheet Card (`frontend/src/components/Timesheet/TimesheetCard.tsx`)
- Individual timesheet display
- Status indicators and badges
- Work hour calculations
- Approval actions

## Usage Guide

### For Staff Members

1. **Access the Clock In/Out Page**
   - Navigate to Staff Control Center
   - Click on "Clock In/Out" tab

2. **Clock In**
   - Click the "Clock In" button
   - Add optional notes
   - Your work day starts

3. **Manage Breaks**
   - Click "Lunch Break" or "Coffee Break"
   - Click "End Break" when returning

4. **Clock Out**
   - Click "Clock Out" at end of day
   - Add optional notes
   - Your work day is complete

### For Administrators

1. **Access Timesheet Management**
   - Navigate to Staff Control Center
   - Click on "Timesheets" tab

2. **View Statistics**
   - Overview tab shows key metrics
   - Department performance analysis
   - Status distribution charts

3. **Manage Timesheets**
   - Filter by date range, department, status
   - Review individual timesheets
   - Approve or reject with notes

4. **Monitor Staff**
   - Real-time staff status
   - Work hour tracking
   - Break management oversight

## Database Schema

### Timesheet Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  date: Date,
  clockIn: {
    time: Date,
    location: String,
    method: String
  },
  clockOut: {
    time: Date,
    location: String,
    method: String
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    type: String
  }],
  totalWorkHours: Number,
  totalBreakHours: Number,
  status: String,
  notes: String,
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  department: String,
  shift: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Security & Permissions

### Role-Based Access
- **Admin**: Full access to all timesheet data and approval functions
- **Staff**: Access only to their own timesheets and clock in/out functions
- **Department Heads**: Access to department-specific timesheets (planned)

### Data Validation
- Automatic work hour calculations
- Break time validation
- Duplicate clock-in prevention
- Status transition validation

## API Authentication

All timesheet endpoints require authentication:
```javascript
// Required headers
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Error Handling

The system includes comprehensive error handling:
- Validation errors for invalid data
- Authentication errors for unauthorized access
- Business logic errors (e.g., already clocked in)
- Database connection errors

## Future Enhancements

### Planned Features
1. **Mobile App**: Native mobile application for clock in/out
2. **Geolocation**: GPS-based location tracking
3. **Biometric Integration**: Fingerprint/face recognition
4. **Advanced Reporting**: Custom report generation
5. **Payroll Integration**: Automatic payroll calculations
6. **Shift Management**: Advanced shift scheduling
7. **Overtime Tracking**: Automatic overtime detection
8. **Leave Management**: Integration with leave requests

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live updates
2. **Offline Support**: Offline clock in/out with sync
3. **Data Export**: CSV/Excel export functionality
4. **Audit Trail**: Complete audit logging
5. **Performance Optimization**: Database indexing and caching

## Installation & Setup

### Backend Setup
1. Ensure MongoDB is running
2. Install dependencies: `npm install`
3. Set environment variables
4. Start server: `npm start`

### Frontend Setup
1. Install dependencies: `npm install`
2. Configure API endpoints
3. Start development server: `npm run dev`

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/clinic-cms-cms
JWT_SECRET=your_jwt_secret
PORT=5002

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5002/api
```

## Testing

### API Testing
```bash
# Test timesheet endpoints
curl -X GET http://localhost:5002/api/timesheets/stats
curl -X POST http://localhost:5002/api/timesheets/clock-in
curl -X POST http://localhost:5002/api/timesheets/clock-out
```

### Frontend Testing
- Navigate to Staff Control Center
- Test clock in/out functionality
- Verify timesheet dashboard
- Test admin approval workflow

## Troubleshooting

### Common Issues
1. **Clock In Error**: Already clocked in today
2. **Break Error**: Already on break
3. **Approval Error**: Insufficient permissions
4. **Data Loading**: Check API connectivity

### Debug Steps
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database connection
4. Validate user permissions

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintainer**: Development Team 