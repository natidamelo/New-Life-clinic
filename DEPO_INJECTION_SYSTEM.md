# Depo Injection Management System

## Overview

The Depo Injection Management System provides comprehensive tracking and scheduling for Depo-Provera injections with Ethiopian calendar support. This system automatically calculates next injection dates (every 12 weeks/84 days) and displays them in both Gregorian and Ethiopian calendars.

## Features

### 🗓️ Ethiopian Calendar Integration
- Automatic conversion between Gregorian and Ethiopian calendars
- Display of next injection dates in Ethiopian format
- Support for Ethiopian calendar calculations and date arithmetic

### 📅 Automatic Scheduling
- Calculates next injection date automatically (12 weeks from last injection)
- Integrates with existing appointment system
- Auto-schedules follow-up appointments

### 📊 Dashboard & Analytics
- Overview of all Depo injection schedules
- Statistics: total schedules, overdue injections, due today, due this week
- Status tracking: overdue, due, due soon, upcoming

### 🔄 Integration with Existing Systems
- Automatically creates schedules when Depo injections are administered
- Links with inventory management for medication tracking
- Integrates with appointment scheduling system

## API Endpoints

### Schedule Management
- `POST /api/depo-injections/schedules` - Create new schedule
- `GET /api/depo-injections/schedules` - Get all schedules
- `GET /api/depo-injections/schedules/:id` - Get single schedule
- `PUT /api/depo-injections/schedules/:id` - Update schedule
- `PUT /api/depo-injections/schedules/:id/cancel` - Cancel schedule

### Injection Recording
- `POST /api/depo-injections/schedules/:id/record` - Record injection administration
- `GET /api/depo-injections/schedules/:id/history` - Get injection history

### Patient Management
- `GET /api/depo-injections/patient/:patientId` - Get patient's schedules

### Dashboard & Reports
- `GET /api/depo-injections/dashboard` - Get dashboard data
- `GET /api/depo-injections/upcoming` - Get upcoming injections
- `GET /api/depo-injections/overdue` - Get overdue injections
- `GET /api/depo-injections/statistics` - Get statistics

### Search & Filter
- `GET /api/depo-injections/search` - Search schedules

## Frontend Components

### Main Components
- `DepoInjectionDashboard` - Main dashboard with overview and statistics
- `DepoInjectionScheduleModal` - Modal for creating new schedules
- `DepoInjectionList` - List view of schedules with filtering
- `EthiopianCalendarDisplay` - Component for displaying Ethiopian dates

### Pages
- `/app/depo-injections` - Main Depo injection management page

## Usage

### Creating a New Schedule

1. Navigate to the Depo Injections page
2. Click "New Schedule" button
3. Fill in the required information:
   - Patient selection
   - First injection date
   - Prescribing doctor
   - Notes and instructions
   - Reminder settings
4. The system will automatically calculate the next injection date

### Recording an Injection

1. Find the patient's schedule in the dashboard
2. Click "Record" button when injection is due
3. The system will:
   - Record the injection in history
   - Calculate the next injection date
   - Update Ethiopian calendar dates
   - Auto-schedule next appointment (if enabled)

### Viewing Ethiopian Calendar Dates

All injection dates are displayed in both calendars:
- **Ethiopian Calendar**: Shows month name, day, and year in Ethiopian format
- **Gregorian Calendar**: Shows standard date format

## Database Schema

### DepoInjectionSchedule Model
```javascript
{
  patient: ObjectId,           // Reference to Patient
  patientName: String,         // Patient's full name
  patientId: String,           // Patient ID
  firstInjectionDate: Date,    // Date of first injection
  lastInjectionDate: Date,     // Date of last injection
  nextInjectionDate: Date,     // Calculated next injection date
  nextInjectionEthiopianDate: { // Ethiopian calendar date
    year: Number,
    month: Number,
    day: Number,
    monthName: String,
    formatted: String
  },
  injectionInterval: Number,   // Days between injections (default: 84)
  status: String,              // active, completed, cancelled, on_hold
  injectionHistory: [InjectionRecord],
  reminderSettings: Object,
  prescribingDoctor: ObjectId,
  notes: String,
  instructions: String,
  // ... other fields
}
```

## Ethiopian Calendar Implementation

The system includes a comprehensive Ethiopian calendar utility (`ethiopianCalendar.js`) that provides:

- Conversion between Gregorian and Ethiopian dates
- Date arithmetic (adding days, calculating intervals)
- Leap year calculations
- Formatted date display

### Ethiopian Calendar Features
- 13 months: 12 months of 30 days + 1 month of 5-6 days
- Year offset: approximately 7-8 years behind Gregorian
- Automatic leap year handling
- Month names in Amharic/English

## Integration Points

### Medication Administration
When a Depo injection is administered through the existing medication system:
1. System detects "depo" in medication name
2. Automatically creates or updates Depo schedule
3. Records injection in history
4. Calculates next injection date

### Appointment System
- Auto-schedules next injection appointments
- Links appointments with Depo schedules
- Provides Ethiopian calendar dates in appointment notes

### Inventory Management
- Tracks Depo medication usage
- Links inventory transactions with injection records
- Maintains medication stock levels

## Access Control

The Depo injection system is accessible to:
- **Admins**: Full access to all features
- **Doctors**: Can create schedules, view all patient schedules
- **Nurses**: Can record injections, view schedules

## Future Enhancements

Potential improvements for the system:
- SMS/Email reminder notifications
- Mobile app integration
- Advanced reporting and analytics
- Integration with external calendar systems
- Multi-language support for Ethiopian calendar
- Automated follow-up scheduling

## Technical Notes

### Dependencies
- MongoDB for data storage
- Express.js for API endpoints
- React with TypeScript for frontend
- Ethiopian calendar calculations

### Performance Considerations
- Indexed database queries for efficient searching
- Cached Ethiopian calendar calculations
- Optimized date arithmetic operations

### Error Handling
- Graceful handling of calendar conversion errors
- Fallback to Gregorian dates if Ethiopian conversion fails
- Comprehensive error logging and user feedback

