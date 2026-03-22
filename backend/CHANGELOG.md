# Changelog

## [1.0.0] - 2023

### Added
- New integrated medical record system with finance and inventory connections
- Enhanced prescription management with inventory tracking
- Medical invoicing directly tied to medical records
- Comprehensive data migration utility from old PatientHistory model

### Changed
- Replaced PatientHistory model with enhanced MedicalRecord model
- Updated prescription model to link with inventory items
- Modified doctorRoutes, prescriptions, and patient routes to use the new system
- Improved lab results with better integration to medical records

### Deprecated
- PatientHistory model (kept as PatientHistory.backup.js for reference)

### Fixed
- Auth middleware issues in routes
- Various integration bugs between modules

### Security
- Better separation of concerns between medical, finance and inventory systems
- Improved audit trails for medical procedures and prescriptions

## Migration Guide

To migrate existing patient history data to the new medical records system:

1. Ensure your database is running
2. Run the migration script from the project root:
   ```
   migrate-patient-history.bat
   ```
3. Check the migration log at `backend/scripts/migration-log.txt`
4. Verify that data has been correctly migrated

## Key Benefits of New System

- **Better Integration**: Medical records directly connected to finance and inventory
- **Automated Inventory Adjustments**: When medications are prescribed or administered
- **Direct Invoice Generation**: Services, medications and procedures automatically included in invoices
- **Resource Tracking**: Clear tracking of all resources used in patient care
- **Comprehensive Documentation**: Complete medical history with attached financial accountability

## 2025-06-18

### Fixed
- Fixed age field inconsistency in MongoDB database
  - Removed duplicate "Age" (capitalized) fields
  - Converted date values to numeric age values
  - Ensured all patients have a lowercase "age" field with numeric values
- Fixed server connectivity issues
  - Created combined-server.js that provides all necessary endpoints:
    - `/api/card-types`
    - `/api/patients`
    - `/api/patients/quick-load`
    - `/api/doctors`
    - `/api/nurse`
    - `/api/notifications`
  - Fixed route.post() error in patients.js using asyncHandler
  - Added proper CORS configuration to allow frontend requests
  - Created start-server.bat for easy server startup

### Added
- Added fix-age-field.js script to fix age field issues in the database
- Added README.md with instructions for running the server and fixing database issues
- Added mock data for card types, patients, doctors, and nurses

## Previous Versions

### Initial Release
- Basic patient management functionality
- Authentication and authorization
- Medical records management
- Appointment scheduling
- Billing and invoicing 