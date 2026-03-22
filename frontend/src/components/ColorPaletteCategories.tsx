import React, { useState } from 'react';
import { applyPrimaryColorToDashboard, getCurrentPrimaryColor } from '../utils/primaryColorUtils';

interface ColorCategory {
  name: string;
  colors: Array<{ name: string; value: string; description?: string }>;
}

const ColorPaletteCategories: React.FC = () => {
  const [currentColor, setCurrentColor] = useState(getCurrentPrimaryColor());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const colorCategories: ColorCategory[] = [
    {
      name: 'Primary',
      colors: [
        { name: 'Blue', value: '#3B82F6', description: 'Professional, trustworthy' },
        { name: 'Green', value: '#10B981', description: 'Health, growth, nature' },
        { name: 'Purple', value: '#8B5CF6', description: 'Premium, creative' },
        { name: 'Red', value: '#EF4444', description: 'Urgent, attention' }
      ]
    },
    {
      name: 'Medical',
      colors: [
        { name: 'Emerald', value: '#059669', description: 'Medical green' },
        { name: 'Teal', value: '#0D9488', description: 'Calming, healing' },
        { name: 'Sky', value: '#0891B2', description: 'Clean, sterile' },
        { name: 'Cyan', value: '#06B6D4', description: 'Fresh, modern' }
      ]
    },
    {
      name: 'Warm',
      colors: [
        { name: 'Amber', value: '#F59E0B', description: 'Warm, friendly' },
        { name: 'Orange', value: '#EA580C', description: 'Energetic, optimistic' },
        { name: 'Bronze', value: '#B45309', description: 'Rich, professional' },
        { name: 'Rust', value: '#7C2D12', description: 'Earthy, grounded' }
      ]
    },
    {
      name: 'Cool',
      colors: [
        { name: 'Indigo', value: '#6366F1', description: 'Deep, sophisticated' },
        { name: 'Violet', value: '#7C3AED', description: 'Luxury, premium' },
        { name: 'Slate', value: '#374151', description: 'Neutral, professional' },
        { name: 'Olive', value: '#65A30D', description: 'Natural, balanced' }
      ]
    },
    {
      name: 'Vibrant',
      colors: [
        { name: 'Pink', value: '#EC4899', description: 'Friendly, approachable' },
        { name: 'Fuchsia', value: '#DB2777', description: 'Bold, confident' },
        { name: 'Magenta', value: '#BE185D', description: 'Dynamic, energetic' },
        { name: 'Lime', value: '#84CC16', description: 'Fresh, energetic' }
      ]
    }
  ];

  const allColors = colorCategories.flatMap(category => category.colors);

  const handleColorTest = (color: string) => {
    applyPrimaryColorToDashboard(color);
    setCurrentColor(color);
  };

  const getDisplayColors = () => {
    if (selectedCategory === 'all') {
      return allColors;
    }
    return colorCategories.find(cat => cat.name === selectedCategory)?.colors || [];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Extended Color Palette</h2>
        <div className="text-sm text-muted-foreground">
          Current: <span className="font-medium" style={{ color: currentColor }}>{currentColor}</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/40'
          }`}
        >
          All Colors ({allColors.length})
        </button>
        {colorCategories.map((category) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === category.name
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {category.name} ({category.colors.length})
          </button>
        ))}
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {getDisplayColors().map((color) => (
          <div
            key={color.value}
            className="group cursor-pointer"
            onClick={() => handleColorTest(color.value)}
          >
            <div
              className={`w-full h-16 rounded-lg border-2 transition-all duration-200 ${
                currentColor === color.value
                  ? 'border-border scale-105 shadow-lg'
                  : 'border-border/30 hover:border-border/50 hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
            />
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-muted-foreground">{color.name}</p>
              <p className="text-xs text-muted-foreground">{color.value}</p>
              {color.description && (
                <p className="text-xs text-muted-foreground/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {color.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Color Information */}
      <div className="bg-muted/10 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Color Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {colorCategories.map((category) => (
            <div key={category.name}>
              <h4 className="font-medium text-muted-foreground mb-1">{category.name}</h4>
              <p className="text-muted-foreground">
                {category.colors.map(c => c.name).join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-primary/10 p-4 rounded-lg">
        <h3 className="font-semibold text-primary mb-2">Usage Tips</h3>
        <ul className="text-sm text-primary space-y-1">
          <li>• <strong>Medical:</strong> Best for healthcare applications</li>
          <li>• <strong>Warm:</strong> Creates a friendly, welcoming atmosphere</li>
          <li>• <strong>Cool:</strong> Professional and calming</li>
          <li>• <strong>Vibrant:</strong> Eye-catching and energetic</li>
          <li>• <strong>Primary:</strong> Classic, versatile choices</li>
        </ul>
      </div>
    </div>
  );
};

export default ColorPaletteCategories;
