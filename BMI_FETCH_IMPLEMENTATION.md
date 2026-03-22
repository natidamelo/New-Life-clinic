# BMI Fetch Implementation

This document explains how the BMI (Body Mass Index) fetching functionality has been implemented to retrieve BMI data from nurses in the medical clinic system.

## Overview

The BMI fetching functionality allows doctors and other medical staff to automatically retrieve the latest BMI measurements recorded by nurses for patients. This includes:

- **Automatic BMI calculation** when height and weight are entered
- **BMI classification** (Underweight, Normal, Overweight, Obese classes)
- **Real-time data synchronization** between nurse and doctor interfaces
- **Comprehensive vital signs retrieval** including BMI

## Implementation Details

### 1. Backend API Endpoint

**Route:** `GET /api/vital-signs/patient/:patientId/latest`

**Controller:** `backend/controllers/vitalSignsController.js`

**Function:** `getLatestVitalSigns()`

This endpoint retrieves the most recent vital signs (including BMI) for a specific patient.

### 2. Frontend Service

**File:** `frontend/src/services/vitalSignsService.ts`

**Method:** `getLatestNurseVitals(patientId: string)`

This service method handles the API call to fetch BMI and other vital signs from the nurse.

### 3. Database Schema

**Model:** `backend/models/VitalSigns.js`

The VitalSigns model includes:
- `bmi`: Number field (10-100 range)
- `height`: Number field (10-300 cm)
- `weight`: Number field (0.1-500 kg)
- `measuredBy`: Reference to User (nurse)
- `measurementDate`: Timestamp

## How to Use

### For Nurses

1. **Record Vital Signs:**
   - Navigate to the Nurse Dashboard
   - Select a patient
   - Click "Update Vitals"
   - Enter height and weight
   - BMI is automatically calculated and displayed
   - Save the vital signs

2. **BMI Calculation:**
   - The system automatically calculates BMI using the formula: `BMI = weight(kg) / height(m)²`
   - BMI classification is displayed with color coding
   - Values are stored in the database

### For Doctors

1. **Fetch BMI from Nurse:**
   - Use the `vitalSignsService.getLatestNurseVitals(patientId)` method
   - BMI data is automatically populated in medical record forms
   - Real-time updates when nurses record new vitals

2. **Integration in Medical Records:**
   - BMI appears in the Physical Examination section
   - Auto-populated from nurse recordings
   - Includes classification and timestamp

## API Response Format

```json
{
  "success": true,
  "data": {
    "temperature": "36.8",
    "bloodPressure": "120/80",
    "heartRate": "75",
    "respiratoryRate": "16",
    "oxygenSaturation": "98",
    "height": "170",
    "weight": "70",
    "bmi": "24.2",
    "recordedBy": "Nurse Smith",
    "recordedAt": "2024-01-15T10:30:00Z",
    "recordedByRole": "Nurse"
  }
}
```

## BMI Classification

The system automatically classifies BMI values:

- **Underweight:** < 18.5 (Blue)
- **Normal:** 18.5 - 24.9 (Green)
- **Overweight:** 25.0 - 29.9 (Yellow)
- **Obese Class I:** 30.0 - 34.9 (Orange)
- **Obese Class II:** 35.0 - 39.9 (Red)
- **Obese Class III:** ≥ 40.0 (Dark Red)

## Testing

### Backend Test

Run the test script to verify the API:

```bash
node test-bmi-fetch.js
```

### Frontend Component

Use the `BMIFetchDemo` component to test the functionality:

```tsx
import BMIFetchDemo from './components/BMIFetchDemo';

<BMIFetchDemo patientId="your-patient-id" />
```

## Error Handling

The system handles various error scenarios:

- **No vital signs found:** Returns 404 with appropriate message
- **Invalid patient ID:** Returns 400 with validation error
- **Database errors:** Returns 500 with server error
- **Network issues:** Frontend displays user-friendly error messages

## Security

- **Authentication required:** All API endpoints require valid JWT tokens
- **Authorization:** Nurses can only access their own recordings
- **Data validation:** Input validation on all vital signs fields
- **Audit trail:** All measurements are timestamped and attributed

## Future Enhancements

1. **BMI Trends:** Historical BMI tracking over time
2. **Alerts:** Automatic alerts for significant BMI changes
3. **Integration:** Connect with other health monitoring systems
4. **Mobile Support:** BMI recording via mobile devices
5. **Analytics:** BMI statistics and reporting features

## Troubleshooting

### Common Issues

1. **BMI not showing:**
   - Check if nurse has recorded height and weight
   - Verify patient ID is correct
   - Check browser console for API errors

2. **Calculation errors:**
   - Ensure height is in centimeters
   - Ensure weight is in kilograms
   - Check for invalid numeric values

3. **API errors:**
   - Verify backend server is running
   - Check authentication token
   - Review server logs for detailed errors

### Debug Steps

1. Check browser network tab for API calls
2. Review server logs for backend errors
3. Verify database connection and data
4. Test with known patient data
5. Use the test script to isolate issues

## Support

For technical support or questions about the BMI fetching implementation, please refer to the development team or create an issue in the project repository.
