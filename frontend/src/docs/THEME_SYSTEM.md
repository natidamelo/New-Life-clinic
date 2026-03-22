# Theme System Documentation

## Overview

The clinic application now uses a comprehensive theme system that eliminates hardcoded colors and provides consistent, semantic color tokens across all components. This system supports both light and dark modes with automatic theme switching.

## Key Features

- **Semantic Color Tokens**: Colors are defined by their purpose (status, priority, department, etc.) rather than specific color values
- **Automatic Dark Mode**: All colors automatically adapt to light/dark themes
- **Consistent Application**: Utility functions ensure consistent color usage across components
- **Maintainable**: Easy to update colors globally by changing CSS variables

## Color Categories

### 1. Status Colors
- `--status-success`: Green for completed/successful states
- `--status-warning`: Yellow/Orange for pending/warning states  
- `--status-error`: Red for error/cancelled states
- `--status-info`: Blue for informational/in-progress states

### 2. Priority Colors
- `--priority-urgent`: Red for urgent priority
- `--priority-high`: Orange for high priority
- `--priority-medium`: Yellow for medium priority
- `--priority-low`: Green for low priority

### 3. Task Status Colors
- `--task-completed`: Green for completed tasks
- `--task-in-progress`: Blue for in-progress tasks
- `--task-pending`: Yellow for pending tasks
- `--task-cancelled`: Red for cancelled tasks

### 4. Patient Status Colors
- `--patient-admitted`: Purple for admitted patients
- `--patient-discharged`: Green for discharged patients
- `--patient-outpatient`: Blue for outpatient patients
- `--patient-emergency`: Red for emergency patients

### 5. Department Colors
- `--dept-nurse`: Blue for nursing department
- `--dept-doctor`: Purple for doctor department
- `--dept-lab`: Orange for lab department
- `--dept-imaging`: Yellow for imaging department

## Usage

### CSS Variables
Each color category includes three variants:
- `--color-name`: Main color
- `--color-name-foreground`: Text color for the main color
- `--color-name-bg`: Background color with opacity
- `--color-name-border`: Border color with opacity

### Utility Functions
Use the utility functions in `frontend/src/utils/themeColors.ts`:

```typescript
import { getPriorityColor, getStatusColor, getTaskStatusColor } from '../utils/themeColors';

// Get priority colors
const priorityClass = getPriorityColor('urgent'); // Returns CSS classes

// Get status colors  
const statusClass = getStatusColor('completed');

// Get task status colors
const taskClass = getTaskStatusColor('in-progress');
```

### Direct CSS Usage
For direct CSS usage, use the HSL format:

```css
.my-component {
  background-color: hsl(var(--status-success));
  color: hsl(var(--status-success-foreground));
  border: 1px solid hsl(var(--status-success-border));
}
```

### Tailwind Classes
For Tailwind usage, use the HSL format with arbitrary values:

```jsx
<div className="bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]">
  Success message
</div>
```

## Migration Guide

### Before (Hardcoded Colors)
```jsx
// ❌ Hardcoded colors
<div className="bg-green-100 text-green-800 border-green-200">
  Completed
</div>
```

### After (Theme System)
```jsx
// ✅ Theme system
<div className="bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success))] border-[hsl(var(--status-success-border))]">
  Completed
</div>

// Or using utility functions
<div className={getStatusColor('completed')}>
  Completed
</div>
```

## Benefits

1. **Consistency**: All components use the same color system
2. **Maintainability**: Change colors globally by updating CSS variables
3. **Accessibility**: Colors are designed with proper contrast ratios
4. **Dark Mode**: Automatic dark mode support
5. **Scalability**: Easy to add new color categories or modify existing ones

## Adding New Colors

To add new color categories:

1. Add CSS variables to `frontend/src/styles/themes.css`:
```css
:root {
  --new-category: 142 76% 36%;
  --new-category-foreground: 0 0% 98%;
  --new-category-bg: 142 76% 36% / 0.1;
  --new-category-border: 142 76% 36% / 0.3;
}

.dark {
  --new-category: 142 70% 45%;
  --new-category-foreground: 0 0% 98%;
  --new-category-bg: 142 70% 45% / 0.15;
  --new-category-border: 142 70% 45% / 0.4;
}
```

2. Add utility function to `frontend/src/utils/themeColors.ts`:
```typescript
export const getNewCategoryColor = (value: string): string => {
  switch (value.toLowerCase()) {
    case 'value1': return 'bg-[hsl(var(--new-category))] text-[hsl(var(--new-category-foreground))] border-[hsl(var(--new-category-border))]';
    default: return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};
```

## Testing

The theme system has been tested across all major components:
- ✅ Nurse Tasks
- ✅ Reception Dashboard  
- ✅ Doctor Dashboard
- ✅ Service Patients Management
- ✅ Imaging Dashboard
- ✅ Imaging Results Viewer
- ✅ Rich Text Editor
- ✅ QR Verification

All hardcoded colors have been replaced with semantic theme tokens, ensuring consistent theming across the entire application.