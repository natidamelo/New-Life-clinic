# Billing API Optimization - Multiple API Calls Fix

## Problem
The application was making multiple redundant API calls to `/api/billing/unpaid-invoices` for different patients, causing performance issues and unnecessary server load. This was happening in two main areas:

1. **Header Component**: Making individual API calls for each patient to check for unpaid card payments
2. **ReceptionDashboard**: Making duplicate API calls when assigning patients to nurses

## Solution

### 1. Created Batch Endpoint
Added a new batch endpoint `/api/billing/unpaid-invoices-batch` that can handle multiple patient IDs in a single request:

**Backend Changes:**
- `backend/routes/billing.js`: Added batch endpoint
- `backend/server.js`: Added batch endpoint for compatibility

**Endpoint Details:**
```
GET /api/billing/unpaid-invoices-batch?patientIds=id1,id2,id3
```

**Response Format:**
```json
{
  "success": true,
  "count": 5,
  "data": {
    "patientId1": [invoice1, invoice2],
    "patientId2": [invoice3],
    "patientId3": []
  },
  "summary": [
    {
      "patientId": "id1",
      "invoiceCount": 2,
      "totalAmount": 150.00
    }
  ],
  "totalAmount": 150.00
}
```

### 2. Enhanced Billing Service
Updated `frontend/src/services/billingService.ts` to include new methods:

```typescript
// Individual patient check
async getUnpaidInvoices(patientId: string) {
  const response = await api.get(`/api/billing/unpaid-invoices?patientId=${patientId}`);
  return response.data;
}

// Batch check for multiple patients
async getUnpaidInvoicesBatch(patientIds: string[]) {
  const params = new URLSearchParams();
  params.append('patientIds', patientIds.join(','));
  const response = await api.get(`/api/billing/unpaid-invoices-batch?${params.toString()}`);
  return response.data;
}
```

### 3. Optimized Header Component
Updated `frontend/src/components/Header.tsx` to use the batch endpoint:

- **Before**: Made individual API calls for each patient with a card
- **After**: Uses batch endpoint to check all patients at once
- **Fallback**: Still includes individual calls as fallback if batch fails

### 4. Optimized ReceptionDashboard
Updated `frontend/src/pages/Reception/ReceptionDashboard.tsx`:

- **Created Helper Function**: `checkPatientUnpaidInvoices()` to avoid duplicate calls
- **Eliminated Duplicates**: Removed redundant API calls in error handling
- **Used Billing Service**: Replaced direct API calls with service methods

## Performance Improvements

### Before Optimization:
- Header: N API calls (one per patient with card)
- ReceptionDashboard: 2 API calls per nurse assignment
- Total: Could be 10+ API calls on page load

### After Optimization:
- Header: 1 batch API call + fallback if needed
- ReceptionDashboard: 1 API call per nurse assignment
- Total: 1-2 API calls on page load

## Benefits

1. **Reduced Server Load**: Fewer API calls mean less database queries
2. **Improved Performance**: Faster page loads and better user experience
3. **Better Error Handling**: Graceful fallback to individual calls if batch fails
4. **Maintainable Code**: Centralized billing logic in service layer
5. **Scalable**: Batch endpoint can handle any number of patient IDs

## Testing

Created `backend/test-batch-endpoint.js` to verify the batch endpoint functionality:

```bash
node backend/test-batch-endpoint.js
```

## Usage Examples

### Using the Billing Service:
```typescript
import billingService from '../services/billingService';

// Check single patient
const result = await billingService.getUnpaidInvoices(patientId);

// Check multiple patients
const batchResult = await billingService.getUnpaidInvoicesBatch([id1, id2, id3]);
```

### Direct API Call:
```javascript
// Batch endpoint
const response = await fetch('/api/billing/unpaid-invoices-batch?patientIds=id1,id2,id3');

// Individual endpoint (still available)
const response = await fetch('/api/billing/unpaid-invoices?patientId=id1');
```

## Migration Notes

- All existing functionality remains unchanged
- Individual endpoint still available for backward compatibility
- Frontend components automatically use optimized approach
- No breaking changes to existing API contracts 