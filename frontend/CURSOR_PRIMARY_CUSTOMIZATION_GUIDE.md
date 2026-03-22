# Cursor & Primary Color Customization Guide

This guide explains how to customize cursor appearance and primary colors throughout your clinic dashboard application.

## Overview

The application now includes a comprehensive system for customizing:
- **Cursor appearance** - Different cursor styles for various UI elements
- **Primary color scheme** - Consistent color theming across the entire dashboard
- **Interactive elements** - Enhanced hover, focus, and active states
- **Accessibility** - Support for high contrast and reduced motion preferences

## Files Structure

```
frontend/src/styles/
├── cursor-and-primary.css    # Main customization file
├── themes.css               # Enhanced with primary color variables
├── globals.css              # Updated to import customizations
└── index.css                # Entry point for all styles

frontend/src/components/
├── settings/AppearanceSettings.tsx  # Enhanced settings UI
└── CursorPrimaryDemo.tsx            # Demo component
```

## Features

### 1. Cursor Customization

#### Available Cursor Styles
- `default` - Standard system cursor
- `pointer` - Hand pointer for interactive elements
- `text` - Text cursor for input areas
- `crosshair` - Precision cursor for detailed work
- `help` - Help cursor with question mark
- `wait` - Loading state cursor
- `not-allowed` - Disabled element cursor
- `grab` / `grabbing` - Drag and drop cursors
- `move` - Movable element cursor
- `resize` - Resizable element cursor
- `zoom-in` / `zoom-out` - Zoom cursors

#### Automatic Cursor Application
The system automatically applies appropriate cursors to:
- Buttons and clickable elements → `pointer`
- Text inputs and textareas → `text`
- Disabled elements → `not-allowed`
- Loading states → `wait`
- Help elements → `help`

### 2. Primary Color System

#### Color Palette
Each primary color includes a complete palette:
- `--primary-color-50` to `--primary-color-950` (shades)
- `--primary-hover` (hover state)
- `--primary-active` (active state)
- `--primary-focus` (focus state)
- `--primary-disabled` (disabled state)

#### Available Colors
- **Blue** (#3B82F6) - Default
- **Green** (#10B981)
- **Amber** (#F59E0B)
- **Red** (#EF4444)
- **Purple** (#8B5CF6)
- **Cyan** (#06B6D6)
- **Pink** (#EC4899)
- **Lime** (#84CC16)

### 3. Enhanced Components

#### Buttons
```css
.btn-primary, .button-primary, .primary-button {
  background-color: var(--primary-color);
  color: var(--primary-text);
  cursor: var(--pointer-cursor);
}
```

#### Links
```css
.primary-link {
  color: var(--primary-color);
  cursor: var(--pointer-cursor);
}
```

#### Form Elements
```css
input:focus, textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

#### Cards and Panels
```css
.card-primary {
  border-left: 4px solid var(--primary-color);
}

.panel-primary {
  border-top: 3px solid var(--primary-color);
}
```

## Usage

### 1. Settings Interface

Access the customization options through:
```
http://localhost:5175/app/settings
```

Navigate to the **Appearance Settings** section where you can:
- Choose your primary color from the color palette
- Select your preferred cursor style
- Preview changes in real-time

### 2. CSS Custom Properties

The system uses CSS custom properties that can be overridden:

```css
:root {
  --primary-color: #3B82F6;
  --default-cursor: default;
  --pointer-cursor: pointer;
  /* ... other properties */
}
```

### 3. Utility Classes

Use utility classes for quick styling:

```html
<!-- Cursor utilities -->
<div class="cursor-pointer">Clickable element</div>
<div class="cursor-text">Text input</div>
<div class="cursor-not-allowed">Disabled element</div>

<!-- Primary color utilities -->
<div class="text-primary">Primary text</div>
<div class="bg-primary">Primary background</div>
<div class="border-primary">Primary border</div>
<div class="shadow-primary">Primary shadow</div>

<!-- State utilities -->
<div class="hover-primary">Hover effect</div>
<div class="focus-primary">Focus effect</div>
<div class="active-primary">Active effect</div>
```

### 4. Component Classes

Use semantic component classes:

```html
<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="button-primary">Primary Button</button>
<button class="primary-button">Primary Button</button>

<!-- Links -->
<a href="#" class="primary-link">Primary Link</a>

<!-- Cards -->
<div class="card-primary">Primary Card</div>
<div class="panel-primary">Primary Panel</div>

<!-- Badges -->
<span class="badge-primary">Primary Badge</span>
<span class="tag-primary">Primary Tag</span>

<!-- Alerts -->
<div class="alert-primary">Primary Alert</div>
```

## Accessibility Features

### 1. High Contrast Support
```css
@media (prefers-contrast: high) {
  :root {
    --primary-color: #0000FF; /* High contrast blue */
  }
}
```

### 2. Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

### 3. Touch Device Optimization
```css
@media (hover: none) and (pointer: coarse) {
  button, a, [role="button"] {
    min-height: 44px; /* Minimum touch target size */
    min-width: 44px;
  }
}
```

## Dark Mode Support

The system automatically adjusts colors for dark mode:

```css
.dark {
  --primary-color: #60A5FA; /* Lighter blue for dark mode */
  /* ... other dark mode adjustments */
}
```

## Demo Component

Use the `CursorPrimaryDemo` component to test and showcase the customization features:

```tsx
import CursorPrimaryDemo from './components/CursorPrimaryDemo';

// Use in your app
<CursorPrimaryDemo />
```

## Customization Examples

### 1. Custom Primary Color
```javascript
// In AppearanceSettings.tsx
const handleColorChange = async (color: string) => {
  // Apply the new color
  document.documentElement.style.setProperty('--primary-color', color);
  
  // Generate and apply color variations
  const colorVariations = generateColorVariations(color);
  Object.entries(colorVariations).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--primary-color-${key}`, value);
  });
};
```

### 2. Custom Cursor Style
```javascript
// In AppearanceSettings.tsx
const handleCursorChange = async (cursorStyle: string) => {
  // Apply cursor style
  document.documentElement.style.setProperty('--default-cursor', cursorStyle);
  document.body.style.cursor = cursorStyle;
};
```

### 3. Adding New Color Variations
```css
/* Add to cursor-and-primary.css */
:root {
  --primary-color-25: #F8FAFC;
  --primary-color-75: #CBD5E1;
  /* ... other custom variations */
}
```

## Best Practices

1. **Consistency**: Use the provided utility classes and component classes for consistent styling
2. **Accessibility**: Always test with high contrast and reduced motion preferences
3. **Performance**: The system uses CSS custom properties for efficient updates
4. **User Experience**: Provide visual feedback for all interactive elements
5. **Mobile**: Ensure touch targets meet minimum size requirements (44px)

## Troubleshooting

### Common Issues

1. **Colors not updating**: Ensure CSS custom properties are properly set
2. **Cursor not changing**: Check if cursor styles are being overridden by other CSS
3. **Dark mode issues**: Verify dark mode color variations are defined
4. **Accessibility problems**: Test with screen readers and keyboard navigation

### Debug Tips

1. Use browser dev tools to inspect CSS custom properties
2. Check for CSS specificity conflicts
3. Verify that all required files are imported
4. Test in different browsers and devices

## Future Enhancements

Potential improvements for the system:
- Custom color picker for unlimited color choices
- Cursor animation effects
- Theme presets (medical, corporate, etc.)
- Export/import customization settings
- A/B testing for different color schemes

## Support

For issues or questions about the cursor and primary color customization system:
1. Check this documentation first
2. Review the demo component for examples
3. Test with the settings interface
4. Check browser console for any errors

---

*This customization system provides a solid foundation for creating a personalized and accessible clinic dashboard experience.*
