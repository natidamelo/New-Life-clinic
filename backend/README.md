# Clinic CMS Backend

This is the backend server for the Clinic CMS application.

## Setup

1. Make sure MongoDB is installed and running locally on port 27017
2. Install dependencies: `npm install`

## Running the Server

You can run the server using one of the following methods:

### Combined Server (Recommended)

This server provides mock data for all required endpoints:

```
cd backend
node combined-server.js
```

Or use the batch file:

```
cd backend
start-server.bat
```

The server will run on port 5002 and provide the following endpoints:

- `/ping` - Health check
- `/api/card-types` - Card types
- `/api/patients` - Patients
- `/api/patients/quick-load` - Quick load patients
- `/api/doctors` - Doctors
- `/api/nurse` - Nurses
- `/api/notifications` - Notifications

### Patient Server

This server connects to MongoDB and provides real patient data:

```
cd backend
node patient-server.js
```

### Simple Server

This server provides minimal functionality:

```
cd backend
node simple-server.js
```

## Fixing Age Field Issue

If you encounter issues with the age field in the database (duplicate "Age" fields or date values in the age field), you can run the fix script:

```
cd backend
node fix-age-field.js
```

This script will:
- Remove duplicate "Age" fields (capitalized)
- Convert any date values in age field to numeric age
- Ensure all patients have a lowercase "age" field with a numeric value

## Features

- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **User Management**: Admin, doctors, nurses, lab technicians, receptionists, etc.
- **Patient Management**: Complete patient profiles and medical history
- **Appointment Scheduling**: Book, manage, and track appointments
- **Medical Records**: Store and retrieve patient medical records
- **Billing & Invoicing**: Generate invoices for services provided
- **Inventory Management**: Track medical supplies and equipment
- **Real-time Notifications**: WebSocket integration for real-time updates
- **Reporting**: Generate reports on various clinic operations

## Tech Stack

- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: JSON Web Tokens for authentication
- **WebSockets**: Real-time bi-directional communication
- **Winston**: Logging library
- **Jest**: Testing framework

## Getting Started

### Prerequisites

- Node.js (v14.x or higher)
- MongoDB (v4.x or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/clinic-management-system.git
cd clinic-management-system/backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory (use `.env.example` as a template)
```
NODE_ENV=development
PORT=5002
MONGO_URI=mongodb://localhost:27017/clinic-cms-cms-cms
JWT_SECRET=your-secret-key-change-this-in-production
```

4. Start MongoDB service (if not running)
```bash
# On Linux/macOS
sudo service mongod start

# On Windows
net start MongoDB
```

5. Run the database seeder (optional, for development)
```bash
npm run seed
```

6. Start the development server
```bash
npm run dev
```

The API will be available at `http://localhost:5002/api`

## API Documentation

### Authentication Endpoints

| Method | Endpoint                     | Description                       | Access      |
|--------|------------------------------|-----------------------------------|-------------|
| POST   | /api/auth/register           | Register a new user               | Public      |
| POST   | /api/auth/login              | Login and get token               | Public      |
| GET    | /api/auth/me                 | Get current user                  | Private     |
| POST   | /api/auth/forgot-password    | Request password reset            | Public      |
| POST   | /api/auth/reset-password     | Reset password with token         | Public      |
| POST   | /api/auth/change-password    | Change password                   | Private     |

### User Endpoints

| Method | Endpoint                     | Description                       | Access      |
|--------|------------------------------|-----------------------------------|-------------|
| GET    | /api/admin/users             | Get all users                     | Admin       |
| GET    | /api/admin/users/:id         | Get user by ID                    | Admin       |
| PUT    | /api/admin/users/:id         | Update user                       | Admin       |
| DELETE | /api/admin/users/:id         | Delete user                       | Admin       |

### Patient Endpoints

| Method | Endpoint                     | Description                       | Access      |
|--------|------------------------------|-----------------------------------|-------------|
| GET    | /api/patients                | Get all patients                  | Auth        |
| POST   | /api/patients                | Create patient                    | Auth        |
| GET    | /api/patients/:id            | Get patient by ID                 | Auth        |
| PUT    | /api/patients/:id            | Update patient                    | Auth        |
| DELETE | /api/patients/:id            | Delete patient                    | Admin       |

### Appointment Endpoints

| Method | Endpoint                     | Description                       | Access      |
|--------|------------------------------|-----------------------------------|-------------|
| GET    | /api/appointments            | Get all appointments              | Auth        |
| POST   | /api/appointments            | Create appointment                | Auth        |
| GET    | /api/appointments/:id        | Get appointment by ID             | Auth        |
| PUT    | /api/appointments/:id        | Update appointment                | Auth        |
| DELETE | /api/appointments/:id        | Delete appointment                | Auth        |

*For a complete list of all endpoints and their documentation, please refer to our API documentation.*

## Project Structure

```
backend/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/             # Mongoose models
├── routes/             # API routes
├── services/           # Business logic
├── scripts/            # Utility scripts
├── tests/              # Test files
├── app.js              # Express app setup
├── server.js           # Server entry point
└── package.json        # Dependencies and scripts
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Debugging

```bash
# Start server in debug mode
npm run debug
```

## Deployment

### Production Setup

1. Set environment variables for production
2. Build the application (if needed)
3. Start the server

```bash
NODE_ENV=production PORT=5002 npm start
```

### Docker Deployment

A Dockerfile is provided for containerized deployment.

```bash
# Build Docker image
docker build -t clinic-cms-api .

# Run Docker container
docker run -p 5002:5002 -e NODE_ENV=production -e MONGO_URI=your-mongo-uri clinic-cms-api
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Contact

For any inquiries or issues, please open an issue on GitHub. 