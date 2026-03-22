# Medical Referral System - Setup Guide

## 🚀 Quick Start

Follow these steps to get the medical referral system up and running.

## Prerequisites

- Node.js installed
- MongoDB running
- Backend and frontend servers set up

## Backend Setup

### 1. Install Dependencies (if not already installed)

All required dependencies should already be installed. The system uses:
- `mongoose` - For MongoDB interactions
- `express` - Web framework
- `express-validator` - Input validation

### 2. Start the Backend Server

```bash
cd backend
npm run dev
```

The server should start without errors. Look for:
```
✅ Connected to MongoDB
✅ Server running on port 5000
```

### 3. Test the Referral System (Optional)

Run the test script to verify everything is set up correctly:

```bash
node backend/test-referrals.js
```

You should see:
```
✅ All tests passed! Referral system is ready to use.
```

## Frontend Setup

### 1. The frontend files are already in place:

- `frontend/src/services/referralService.ts` - API service
- `frontend/src/components/doctor/EMRReferralPaper.tsx` - Updated with save functionality
- `frontend/src/pages/Doctor/Referrals.tsx` - New referrals management page

### 2. Add the Referrals route to your React Router

In your doctor routes file (usually `frontend/src/App.tsx` or `frontend/src/routes/DoctorRoutes.tsx`), add:

```typescript
import Referrals from './pages/Doctor/Referrals';

// In your routes:
<Route path="/doctor/referrals" element={<Referrals />} />
```

### 3. Add navigation link (optional)

In your doctor navigation menu, add:

```typescript
<NavLink to="/doctor/referrals">
  <FileText className="w-5 h-5" />
  <span>Referrals</span>
</NavLink>
```

### 4. Start the Frontend Server

```bash
cd frontend
npm start
```

## Usage

### Creating a Referral

1. Navigate to: `Doctor Dashboard → EMR → Referral Paper`
2. Search and select a patient
3. Fill in the referral details:
   - Referred to doctor and clinic
   - Medical information (chief complaint, diagnosis, reason)
   - Urgency level
4. Click "Save Referral"
5. Success message will appear
6. Optionally print or download PDF

### Viewing Saved Referrals

**Option 1: From Referral Paper page**
1. Click "View Saved" button
2. Modal shows all saved referrals
3. Click on any referral to view details

**Option 2: From Referrals Management page**
1. Navigate to: `Doctor Dashboard → Referrals`
2. View statistics dashboard
3. Use filters to find specific referrals
4. Click eye icon to view details
5. Click printer icon to print

## API Endpoints

The following endpoints are now available:

- `GET /api/referrals` - Get all referrals (with pagination)
- `POST /api/referrals` - Create new referral
- `GET /api/referrals/:id` - Get specific referral
- `PUT /api/referrals/:id` - Update referral
- `DELETE /api/referrals/:id` - Cancel referral
- `GET /api/referrals/stats` - Get statistics
- `GET /api/referrals/patient/:patientId` - Get patient's referrals
- `GET /api/referrals/doctor/:doctorId` - Get doctor's referrals

## Testing the System

### Manual Testing Checklist

1. **Create a Referral**
   - [ ] Select a patient
   - [ ] Fill required fields
   - [ ] Click Save Referral
   - [ ] Verify success message

2. **View Saved Referrals**
   - [ ] Click View Saved button
   - [ ] Verify referrals appear in modal
   - [ ] Click on a referral to view details

3. **Referrals Management Page**
   - [ ] Navigate to Referrals page
   - [ ] Verify statistics display
   - [ ] Use search functionality
   - [ ] Use status filter
   - [ ] Use urgency filter
   - [ ] Test pagination

4. **Print Functionality**
   - [ ] Click Print button
   - [ ] Verify print preview looks correct

### API Testing with Postman/Thunder Client

1. **Create Referral**
   ```
   POST http://localhost:5000/api/referrals
   Headers: Authorization: Bearer <your-token>
   Body: {
     "patientId": "...",
     "patientName": "...",
     "patientAge": 30,
     "patientGender": "Male",
     "patientAddress": "...",
     "patientPhone": "...",
     "medicalRecordNumber": "...",
     "referredToDoctorName": "Dr. Smith",
     "referredToClinic": "City Hospital",
     "chiefComplaint": "Chest pain",
     "diagnosis": "Suspected cardiac issue",
     "reasonForReferral": "Cardiology consultation needed",
     "urgency": "urgent"
   }
   ```

2. **Get All Referrals**
   ```
   GET http://localhost:5000/api/referrals
   Headers: Authorization: Bearer <your-token>
   ```

3. **Get Statistics**
   ```
   GET http://localhost:5000/api/referrals/stats
   Headers: Authorization: Bearer <your-token>
   ```

## Troubleshooting

### Issue: "Cannot find module 'Referral'"

**Solution:** Make sure the backend server is restarted after adding new files.

```bash
cd backend
npm run dev
```

### Issue: Referrals not saving

**Solution:** Check that:
1. MongoDB is running
2. User is authenticated (has valid token)
3. All required fields are filled
4. Check browser console for errors

### Issue: API returns 404

**Solution:** Verify that:
1. Route is added in `backend/app.js`
2. Backend server is running
3. API URL is correct (`/api/referrals`)

### Issue: Patient search not working

**Solution:**
1. Ensure patients exist in the database
2. Check patient service is working
3. Verify network tab in browser for errors

## Database Verification

To verify referrals are being saved, use MongoDB Compass or mongo shell:

```javascript
// Connect to your database
use clinic-db

// Count referrals
db.referrals.countDocuments()

// View recent referrals
db.referrals.find().sort({ createdAt: -1 }).limit(5).pretty()

// View statistics
db.referrals.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      sent: { $sum: { $cond: [{ $eq: ['$status', 'Sent'] }, 1, 0] } },
      urgent: { $sum: { $cond: [{ $eq: ['$urgency', 'urgent'] }, 1, 0] } }
    }
  }
])
```

## Next Steps

1. **Add to Navigation Menu:** Add a link to the Referrals page in your doctor dashboard navigation
2. **Test Thoroughly:** Create several test referrals with different urgencies and statuses
3. **Train Users:** Show doctors how to use the new referral system
4. **Monitor:** Watch for any errors in the console logs
5. **Backup:** Ensure MongoDB is being backed up regularly

## Support

If you encounter any issues:

1. Check the console logs (both backend and frontend)
2. Verify all files are in the correct locations
3. Ensure MongoDB is running and accessible
4. Check that authentication is working
5. Review the error messages for specific issues

## File Locations

For reference, here are the key file locations:

**Backend:**
- Model: `backend/models/Referral.js`
- Controller: `backend/controllers/referralController.js`
- Routes: `backend/routes/referrals.js`
- App integration: `backend/app.js` (line 668)
- Test: `backend/test-referrals.js`

**Frontend:**
- Service: `frontend/src/services/referralService.ts`
- Component: `frontend/src/components/doctor/EMRReferralPaper.tsx`
- Page: `frontend/src/pages/Doctor/Referrals.tsx`

**Documentation:**
- Implementation guide: `REFERRAL_SYSTEM_IMPLEMENTATION.md`
- Setup guide: `REFERRAL_SETUP_GUIDE.md` (this file)

## Success Criteria

The system is working correctly when:

✅ Backend server starts without errors
✅ Referral routes are accessible
✅ Can create referrals from the form
✅ Referrals are saved to MongoDB
✅ Can view saved referrals
✅ Statistics display correctly
✅ Search and filters work
✅ Print functionality works
✅ No console errors

---

**Implementation Complete!** 🎉

The medical referral system is now ready for use. Enjoy the new functionality!

