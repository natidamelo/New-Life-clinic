# Medical Certificate Management System

A comprehensive medical certificate management system for the New Life Clinic doctor's dashboard.

## Features

### 🏥 Certificate Management
- **Create Medical Certificates**: Generate professional medical certificates for patients
- **Multiple Certificate Types**: Support for Medical, Sick Leave, Fitness, and Treatment certificates
- **Patient Search**: Quick patient lookup and information auto-fill
- **Draft Saving**: Save certificates as drafts for later completion
- **Certificate Preview**: Preview certificates before issuing
- **Print Functionality**: Professional print-ready certificates

### 📊 Dashboard Features
- **Certificate List**: View all issued certificates with filtering and search
- **Statistics**: Track certificate statistics and trends
- **Status Management**: Track certificate status (Draft, Issued, Cancelled, Expired)
- **Pagination**: Efficient browsing of large certificate lists

### 🔒 Security & Validation
- **Authentication Required**: Only authenticated doctors can access
- **Form Validation**: Comprehensive client and server-side validation
- **Data Sanitization**: Secure handling of patient and medical data
- **Audit Trail**: Track who created and modified certificates

## Usage

### Accessing the System

1. **Login**: Ensure you're logged in as a doctor
2. **Navigate**: Go to `/api/doctor/medical-certificates` or `/medical-certificates/form`
3. **Start Creating**: Use the form to create new medical certificates

### Creating a Certificate

1. **Patient Information**:
   - Search for existing patients or enter new patient details
   - Fill in required patient information (Name, Age, Gender, Address)

2. **Medical Information**:
   - Select certificate type
   - Enter diagnosis (required)
   - Add symptoms, treatment, prescription, and recommendations
   - Set rest period and work restrictions if applicable
   - Set follow-up date if needed

3. **Certificate Validity**:
   - Set valid from and valid until dates
   - Default validity is 30 days from issue date

4. **Clinic Information**:
   - Verify clinic details (pre-filled with defaults)
   - Add any additional notes

5. **Actions**:
   - **Preview**: See how the certificate will look
   - **Save Draft**: Save for later completion
   - **Issue Certificate**: Create and issue the certificate

### Managing Certificates

1. **View Certificates**: Switch to the "View Certificates" tab
2. **Search & Filter**: Use search and filter options to find specific certificates
3. **Actions Available**:
   - **View**: See full certificate details
   - **Edit**: Modify existing certificates
   - **Print**: Print certificate directly
   - **Delete**: Cancel/delete certificates

### Statistics

- View certificate statistics in the "Statistics" tab
- Track total certificates, issued, drafts, and cancelled
- Monitor certificate types distribution

## API Endpoints

### Certificate Management
- `POST /api/medical-certificates` - Create new certificate
- `GET /api/medical-certificates` - List certificates with pagination
- `GET /api/medical-certificates/:id` - Get specific certificate
- `PUT /api/medical-certificates/:id` - Update certificate
- `DELETE /api/medical-certificates/:id` - Cancel certificate

### Patient Integration
- `GET /api/medical-certificates/patient/:patientId` - Get patient certificates
- `GET /api/medical-certificates/doctor/:doctorId` - Get doctor certificates

### Utility Endpoints
- `GET /api/medical-certificates/stats` - Get certificate statistics
- `GET /api/medical-certificates/print/:id` - Get printable certificate data

## File Structure

```
backend/public/medical-certificates/
├── certificate-form.html      # Main form interface
├── certificate-styles.css     # Styling and responsive design
├── certificate-script.js      # JavaScript functionality
└── README.md                  # This documentation
```

## Database Schema

The system uses a comprehensive MongoDB schema with the following key fields:

### Patient Information
- Patient ID, Name, Age, Gender, Address, Phone

### Doctor Information
- Doctor ID, Name, License Number, Specialization

### Medical Information
- Diagnosis, Symptoms, Treatment, Prescription, Recommendations
- Follow-up Date, Rest Period, Work Restrictions

### Certificate Details
- Certificate Number (auto-generated), Type, Status
- Issue Date, Valid From/Until dates
- Clinic Information

### Audit Fields
- Created By, Updated By, Timestamps

## Security Features

1. **Authentication**: JWT token-based authentication
2. **Authorization**: Role-based access control (Doctor role required)
3. **Input Validation**: Server-side validation using express-validator
4. **Data Sanitization**: MongoDB injection prevention
5. **Rate Limiting**: API rate limiting in production
6. **CORS Protection**: Configured CORS policies

## Browser Compatibility

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Responsive**: Optimized for tablets and mobile devices
- **Print Support**: Professional print layouts

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure you're logged in with a valid doctor account
   - Check if your session has expired

2. **Patient Search Issues**:
   - Verify patient exists in the system
   - Check patient ID format

3. **Print Problems**:
   - Ensure pop-ups are allowed for the site
   - Check browser print settings

4. **Form Validation Errors**:
   - Fill all required fields (marked with *)
   - Check date formats and number ranges

### Support

For technical support or feature requests, contact the development team.

## Future Enhancements

- **Digital Signatures**: Add digital signature support
- **Email Integration**: Send certificates via email
- **PDF Generation**: Server-side PDF generation
- **Template System**: Customizable certificate templates
- **Bulk Operations**: Bulk certificate generation
- **Integration**: Integration with EMR systems
- **Mobile App**: Dedicated mobile application

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: Node.js 18+, MongoDB 5+
