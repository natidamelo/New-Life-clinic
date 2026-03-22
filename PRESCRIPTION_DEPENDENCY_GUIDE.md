# Prescription Dependency System Guide

## Overview

The prescription dependency system allows you to enforce sequential medication administration, ensuring that certain prescriptions cannot be administered until prerequisite prescriptions are completed. This is particularly useful for medications that need to be taken in a specific order or for treatments that build upon each other.

## How It Works

### 1. Dependency Structure

Each prescription can have dependencies on other prescriptions:

```javascript
prescriptionDependencies: {
  dependsOn: [{
    prescriptionId: "ObjectId of dependent prescription",
    medicationName: "Name of dependent medication",
    requiredCompletion: "fully_completed" | "partially_completed"
  }],
  isBlocked: false, // Automatically managed by the system
  blockReason: "" // Explanation of why prescription is blocked
}
```

### 2. Completion Requirements

- **`fully_completed`**: All doses of the dependent prescription must be administered
- **`partially_completed`**: At least one dose of the dependent prescription must be administered

### 3. Automatic Blocking

The system automatically:
- Checks dependencies before allowing dose administration
- Blocks prescriptions when dependencies are not met
- Provides clear error messages explaining why administration is blocked
- Unblocks prescriptions when dependencies are satisfied

## Implementation

### Backend Changes

#### 1. NurseTask Model (`backend/models/NurseTask.js`)

Added dependency fields to track prescription relationships:

```javascript
prescriptionDependencies: {
  dependsOn: [{
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription'
    },
    medicationName: String,
    requiredCompletion: {
      type: String,
      enum: ['fully_completed', 'partially_completed'],
      default: 'fully_completed'
    }
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String
}
```

#### 2. Medication Administration Route (`backend/routes/medicationAdministration.js`)

Added dependency checking logic before allowing dose administration:

```javascript
// Check prescription dependencies before allowing administration
if (task.prescriptionDependencies?.dependsOn && task.prescriptionDependencies.dependsOn.length > 0) {
  // Verify all dependencies are met
  // Block administration if dependencies not satisfied
}
```

### Frontend Changes

#### 1. SimplifiedMedicationAdmin Component

Added dependency status display showing:
- Whether the prescription is blocked
- What dependencies exist
- Current status of dependencies
- Clear visual indicators (red for blocked, blue for dependencies met)

## Usage Examples

### Example 1: Sequential Ceftriaxone Treatment

**Scenario**: Patient has two Ceftriaxone prescriptions:
1. **Ceftriaxone 1st**: 5 doses, QD (once daily)
2. **Ceftriaxone 2nd**: 9 doses, TID (3x daily)

**Dependency**: 2nd prescription cannot be administered until 1st is fully completed.

**Setup**:
```javascript
// The system automatically sets up this dependency when prescriptions are created
// 2nd prescription depends on 1st prescription with 'fully_completed' requirement
```

**Result**:
- ✅ **Ceftriaxone 1st**: Can be administered normally
- 🚫 **Ceftriaxone 2nd**: Blocked until all 5 doses of 1st are completed
- Once 1st is complete, 2nd becomes available for administration

### Example 2: Multi-Stage Treatment

**Scenario**: Patient has three sequential treatments:
1. **Initial Treatment**: 3 doses
2. **Maintenance Treatment**: 7 doses  
3. **Follow-up Treatment**: 5 doses

**Dependencies**:
- Maintenance depends on Initial (fully_completed)
- Follow-up depends on Maintenance (fully_completed)

**Result**: Treatments must be completed in sequence, preventing premature administration.

## Setting Up Dependencies

### Automatic Setup

The system automatically detects and sets up dependencies for:
- Multiple prescriptions of the same medication
- Prescriptions created in sequence for the same patient
- Prescriptions with similar medication names

### Manual Setup

You can manually configure dependencies by updating the `prescriptionDependencies` field:

```javascript
await NurseTask.findByIdAndUpdate(taskId, {
  $set: {
    'prescriptionDependencies.dependsOn': [{
      prescriptionId: dependentPrescriptionId,
      medicationName: 'Dependent Medication Name',
      requiredCompletion: 'fully_completed'
    }]
  }
});
```

## Testing the System

### 1. Run the Setup Script

```bash
cd backend
node setup-ceftriaxone-dependencies.js
```

This script will:
- Find all Ceftriaxone prescriptions
- Set up dependencies between sequential prescriptions
- Verify the dependency configuration

### 2. Test the Dependency Logic

```bash
cd backend
node test-dependency-system.js
```

This script will:
- Verify dependencies are properly configured
- Test the blocking logic
- Show current dependency status

### 3. Test in the Frontend

1. Navigate to the Medications page
2. Look for dependency indicators on medication cards
3. Try to administer doses from dependent prescriptions
4. Verify blocking behavior works correctly

## Error Messages

When trying to administer a blocked prescription, you'll see:

```
🚫 Prescription Blocked
Cannot administer Ceftriaxone 2nd until Ceftriaxone 1st is fully completed (2/5 doses)
```

## Benefits

1. **Patient Safety**: Prevents incorrect medication sequence
2. **Treatment Compliance**: Ensures proper treatment progression
3. **Clear Communication**: Nurses understand why medications are blocked
4. **Automated Management**: System handles dependency checking automatically
5. **Flexible Configuration**: Supports various dependency types

## Troubleshooting

### Common Issues

1. **Dependencies not showing**: Check if `prescriptionDependencies` field exists in the NurseTask
2. **Blocking not working**: Verify the dependency check logic in medication administration route
3. **Frontend not updating**: Ensure the component is reading the dependency fields correctly

### Debug Steps

1. Check database for dependency configuration
2. Verify nurse task structure
3. Test dependency logic in isolation
4. Check frontend component state

## Future Enhancements

- **Complex Dependencies**: Support for multiple dependencies and OR/AND logic
- **Time-based Dependencies**: Dependencies based on time intervals
- **Conditional Dependencies**: Dependencies based on patient condition or test results
- **Dependency Visualization**: Better visual representation of prescription relationships

## Support

For issues or questions about the dependency system:
1. Check the logs for error messages
2. Run the test scripts to verify configuration
3. Review the dependency fields in the database
4. Test the system with simple examples first
