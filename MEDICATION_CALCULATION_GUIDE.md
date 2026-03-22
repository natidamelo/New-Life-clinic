# Medication Calculation Guide - Correct Logic for All Frequency Types

## Overview
This guide explains the correct calculation logic for medication pricing based on frequency and duration.

## Calculation Formula
```
Total Cost = Duration (days) × Frequency (doses/day) × Unit Price (ETB/dose)
```

## Frequency Types and Doses Per Day

### 1. QD (Once Daily) = 1 dose/day
- **Examples**: "Once daily", "QD", "1x daily", "daily"
- **Calculation**: `days × 1 dose/day`

### 2. BID (Twice Daily) = 2 doses/day  
- **Examples**: "Twice daily", "BID", "2x daily", "twice"
- **Calculation**: `days × 2 doses/day`

### 3. TID (Three Times Daily) = 3 doses/day
- **Examples**: "Three times daily", "TID", "3x daily", "thrice"
- **Calculation**: `days × 3 doses/day`

### 4. QID (Four Times Daily) = 4 doses/day
- **Examples**: "Four times daily", "QID", "4x daily", "four times"
- **Calculation**: `days × 4 doses/day`

## Examples with Dexamethasone (ETB 300/dose)

### Example 1: 5 days QD (Once Daily)
- **Duration**: 5 days
- **Frequency**: QD (1 dose/day)
- **Calculation**: 5 days × 1 dose/day = 5 total doses
- **Total Cost**: 5 doses × ETB 300 = **ETB 1,500**

### Example 2: 7 days BID (Twice Daily)
- **Duration**: 7 days
- **Frequency**: BID (2 doses/day)
- **Calculation**: 7 days × 2 doses/day = 14 total doses
- **Total Cost**: 14 doses × ETB 300 = **ETB 4,200**

### Example 3: 10 days TID (Three Times Daily)
- **Duration**: 10 days
- **Frequency**: TID (3 doses/day)
- **Calculation**: 10 days × 3 doses/day = 30 total doses
- **Total Cost**: 30 doses × ETB 300 = **ETB 9,000**

### Example 4: 3 days QID (Four Times Daily)
- **Duration**: 3 days
- **Frequency**: QID (4 doses/day)
- **Calculation**: 3 days × 4 doses/day = 12 total doses
- **Total Cost**: 12 doses × ETB 300 = **ETB 3,600**

## Invoice Display Format

### Correct Format:
- **QTY**: Total number of doses (e.g., 5 for 5 days QD)
- **UNIT PRICE**: Price per dose (e.g., ETB 300.00)
- **TOTAL**: Total cost (e.g., ETB 1,500.00)

### Example Invoice Item:
```
DESCRIPTION: Medication: Dexamethasone (5 doses)
QTY: 5
UNIT PRICE: ETB 300.00
TOTAL: ETB 1,500.00
PAYMENT STATUS: Unpaid
```

## Implementation in Code

### Backend Logic (prescriptions.js):
```javascript
// Calculate total doses based on duration and frequency
const duration = medication.duration || '5 days';
const durationMatch = duration.match(/(\d+)\s*(day|days)/i);
const durationDays = durationMatch ? parseInt(durationMatch[1]) : 5;

const freq = (medication.frequency || '').toLowerCase();
let frequencyPerDay = 1;

// Check specific multi-dose patterns
if (freq.includes('four') || freq.includes('qid') || freq.includes('4x')) frequencyPerDay = 4;
else if (freq.includes('three times') || freq.includes('thrice') || freq.includes('tid') || freq.includes('3x')) frequencyPerDay = 3;
else if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x')) frequencyPerDay = 2;
else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd') || freq.includes('1x')) frequencyPerDay = 1;

// Calculate total doses
const medTotalDoses = durationDays * frequencyPerDay;

// Calculate total cost
const medTotalCost = medCostPerDose * medTotalDoses;

// Create invoice item
invoiceItems.push({
  itemType: 'medication',
  category: 'medication',
  description: `Medication: ${medicationName} (${medTotalDoses} doses)`,
  quantity: medTotalDoses,  // Total number of doses
  unitPrice: medCostPerDose,  // Price per dose
  total: medTotalCost  // Total cost
});
```

## Common Mistakes to Avoid

1. **Incorrect QTY**: Setting QTY to 1 instead of total doses
2. **Wrong Frequency Parsing**: Not handling all frequency variations
3. **Missing Duration Parsing**: Not extracting days from duration string
4. **Incorrect Total Calculation**: Not multiplying by total doses

## Testing Checklist

- [ ] QD prescriptions show correct total doses (days × 1)
- [ ] BID prescriptions show correct total doses (days × 2)  
- [ ] TID prescriptions show correct total doses (days × 3)
- [ ] QID prescriptions show correct total doses (days × 4)
- [ ] Unit price is correctly retrieved from inventory
- [ ] Total cost = QTY × UNIT PRICE
- [ ] Invoice status reflects correct balance
