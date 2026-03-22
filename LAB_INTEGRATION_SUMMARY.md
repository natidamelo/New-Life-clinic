# Lab Items Integration - Doctor Dashboard & Inventory System

## Overview
This integration connects the inventory system with the doctor dashboard, allowing lab items added to inventory to automatically appear in the doctor's lab test ordering interface.

## ✅ What's Been Implemented

### 1. Backend API Endpoints

#### `/api/lab-tests/available` (GET)
- Fetches all laboratory category inventory items
- Organizes them by test categories (Chemistry, Hematology, etc.)
- Returns structured data for the doctor dashboard

#### `/api/lab-tests/sync` (GET)
- Checks for recently added lab items (last 24 hours)
- Used for real-time synchronization
- Returns new items with metadata

### 2. Automatic Service Creation
When a lab item is added to inventory:
- Automatically creates a corresponding lab service
- Links the service to the inventory item
- Sets appropriate pricing and metadata

### 3. Frontend Integration

#### Dynamic Lab Test Loading
- `LabRequestForm` now fetches lab tests from inventory instead of using static data
- Real-time synchronization every 30 seconds
- Automatic refresh when new items are detected

#### New Service Layer
- `labTestService.ts` - Dedicated service for lab test API calls
- Centralized error handling and data formatting
- Type-safe interfaces for lab test data

## 🔄 How It Works

### Adding New Lab Items
1. Admin adds lab item via `/app/inventory/new-item`
2. System automatically creates corresponding lab service
3. Item becomes available in doctor dashboard within 30 seconds

### Doctor Dashboard Integration
1. Doctor opens lab test ordering form
2. System fetches current lab items from inventory
3. Items are organized by category and displayed
4. Real-time sync checks for new items every 30 seconds

### Data Flow
```
Inventory System → Lab Items API → Doctor Dashboard
     ↓
Automatic Service Creation → Billing Integration
```

## 📁 Files Modified

### Backend
- `backend/routes/labTests.js` - New API endpoints
- `backend/routes/inventory.js` - Auto-service creation

### Frontend
- `frontend/src/components/doctor/LabRequestForm.tsx` - Dynamic loading
- `frontend/src/services/labTestService.ts` - New service layer

## 🚀 Usage Instructions

### For Admins
1. Go to `/app/inventory/new-item`
2. Select "Lab Item" as item type
3. Fill in lab-specific details (specimen type, storage temperature, etc.)
4. Save - item automatically appears in doctor dashboard

### For Doctors
1. Go to `/app/doctor`
2. Click "Order Lab Test"
3. New lab items appear automatically in the appropriate category
4. Real-time updates every 30 seconds

## 🔧 Configuration

### Real-time Sync Interval
Currently set to 30 seconds. To change:
```typescript
// In LabRequestForm.tsx
}, 30000); // Change this value (in milliseconds)
```

### Lab Test Categories
Categories are automatically determined based on test names:
- Chemistry: glucose, urea, creatinine, etc.
- Hematology: hemoglobin, CBC, etc.
- Immunology: HIV, hepatitis, etc.
- And more...

## 🧪 Testing the Integration

### Test Scenario 1: Add New Lab Item
1. Add a new lab item in inventory system
2. Check doctor dashboard within 30 seconds
3. Verify item appears in correct category

### Test Scenario 2: Real-time Sync
1. Keep doctor dashboard open
2. Add multiple lab items from inventory
3. Verify all items appear without page refresh

### Test Scenario 3: Service Creation
1. Add lab item with specific details
2. Check services list
3. Verify corresponding service was created

## 🐛 Troubleshooting

### Lab Items Not Appearing
1. Check if item category is set to "laboratory"
2. Verify item is active (`isActive: true`)
3. Check browser console for API errors

### Sync Issues
1. Verify authentication token is valid
2. Check network connectivity
3. Review server logs for API errors

### Service Creation Issues
1. Check if Service model is properly imported
2. Verify user permissions for service creation
3. Review inventory creation logs

## 📊 Benefits

1. **Unified Data Source**: Single source of truth for lab items
2. **Real-time Updates**: Automatic synchronization
3. **Reduced Duplication**: No need to maintain separate lab test lists
4. **Better Inventory Management**: Direct link between inventory and services
5. **Improved Workflow**: Seamless integration between admin and doctor interfaces

## 🔮 Future Enhancements

1. **WebSocket Integration**: Real-time updates without polling
2. **Batch Operations**: Add multiple lab items at once
3. **Advanced Filtering**: Search and filter lab items
4. **Usage Analytics**: Track which lab items are most ordered
5. **Automated Reordering**: Low stock alerts for lab items

## 📝 Notes

- The integration maintains backward compatibility with existing static lab tests
- Fallback mechanisms ensure the system works even if API calls fail
- All changes are logged for audit purposes
- The system is designed to handle high-frequency updates efficiently
