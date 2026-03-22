# New Life Healthcare Clinic - Backend Setup Guide

This guide will help you set up the backend API for the New Life Healthcare Clinic management system.

## Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd clinic-new-life/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment variables file**
Create a `.env` file in the backend directory with the following content:
```
# Server Configuration
PORT=5002
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/clinic-cms-cms-cms

# JWT Configuration
JWT_SECRET=change_this_to_a_secure_random_string
JWT_EXPIRE=24h

# WebSocket Configuration
WS_PATH=/ws
```

4. **Set up MongoDB**
Make sure MongoDB is installed and running on your system or use MongoDB Atlas.
The application will connect to the database specified in your `.env` file.

5. **Seed the database**

To set up a complete test environment with mock data:
```bash
npm run seed-all
```

Or you can run individual seed commands:

```bash
# Add basic services
npm run seed-services

# Add a default doctor account
npm run seed-doctor

# Add test patients
npm run seed-patient

# Add test appointments
npm run seed-appointments

# Add facility data (if available)
npm run seed-facility
```

The default admin account is:
- Email: admin@clinic.com
- Password: admin123

The default doctor account is:
- Email: doctor@clinic.com
- Password: doctor123

6. **Start the development server**
```bash
npm run dev
```

The API will be available at http://localhost:5002.

## API Testing

You can run the appointment API tests with:
```bash
npm run test:appointments
```

## API Structure

We've implemented several key API endpoints:

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `GET /api/appointments/dashboard-summary` - Get counts for dashboard
- `GET /api/appointments/today` - Get today's appointments
- `GET /api/appointments/upcoming` - Get upcoming appointments
- `GET /api/appointments/slots` - Get available time slots for a doctor
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID

### Patients
- `GET /api/patients/list` - Get patient list for appointments
- `GET /api/patients/details/:id` - Get patient details
- `POST /api/patients/quick` - Quickly create patient during booking

### Services
- `GET /api/services` - Get all medical services
- `GET /api/services/:id` - Get service by ID

## Troubleshooting

If you don't see any appointments on the dashboard:

1. Make sure the backend server is running (`npm run dev`)
2. Check if appointments exist in the database (`npm run seed-appointments`)
3. Verify that doctors and patients exist (`npm run seed-doctor` and `npm run seed-patient`)
4. Check your browser console for any API errors

For other issues:

1. Verify MongoDB is running
2. Check your `.env` file configuration
3. Ensure your port is not already in use
4. Check the logs for detailed error messages 