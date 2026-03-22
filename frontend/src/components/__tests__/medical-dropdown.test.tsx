import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MedicalDropdown, { MEDICAL_DROPDOWN_OPTIONS } from '../ui/medical-dropdown';

describe('MedicalDropdown Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders with basic props', () => {
    render(
      <MedicalDropdown
        label="Test Dropdown"
        value=""
        onChange={mockOnChange}
        options={[
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' }
        ]}
      />
    );

    expect(screen.getByLabelText('Test Dropdown')).toBeInTheDocument();
  });

  test('displays options correctly', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
      />
    );

    const select = screen.getByLabelText('Severity');
    fireEvent.mouseDown(select);

    expect(screen.getByText('Mild')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });

  test('calls onChange when option is selected', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
      />
    );

    const select = screen.getByLabelText('Severity');
    fireEvent.mouseDown(select);

    const option = screen.getByText('Moderate');
    fireEvent.click(option);

    expect(mockOnChange).toHaveBeenCalledWith('Moderate');
  });

  test('displays descriptions when provided', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
      />
    );

    const select = screen.getByLabelText('Severity');
    fireEvent.mouseDown(select);

    expect(screen.getByText('Minimal discomfort, no interference with daily activities')).toBeInTheDocument();
  });

  test('shows error state', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
        error="This field is required"
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('shows helper text', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
        helperText="Choose the appropriate severity level"
      />
    );

    expect(screen.getByText('Choose the appropriate severity level')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(
      <MedicalDropdown
        label="Severity"
        value=""
        onChange={mockOnChange}
        options={MEDICAL_DROPDOWN_OPTIONS.severity}
        disabled={true}
      />
    );

    const select = screen.getByLabelText('Severity');
    expect(select).toBeDisabled();
  });

  test('displays all predefined medical dropdown options', () => {
    // Test severity options
    expect(MEDICAL_DROPDOWN_OPTIONS.severity).toHaveLength(3);
    expect(MEDICAL_DROPDOWN_OPTIONS.severity.map(opt => opt.value)).toEqual(['Mild', 'Moderate', 'Severe']);

    // Test onset pattern options
    expect(MEDICAL_DROPDOWN_OPTIONS.onsetPattern).toHaveLength(3);
    expect(MEDICAL_DROPDOWN_OPTIONS.onsetPattern.map(opt => opt.value)).toEqual(['Acute', 'Subacute', 'Chronic']);

    // Test progression options
    expect(MEDICAL_DROPDOWN_OPTIONS.progression).toHaveLength(4);
    expect(MEDICAL_DROPDOWN_OPTIONS.progression.map(opt => opt.value)).toEqual(['Improving', 'Worsening', 'Stable', 'Fluctuating']);

    // Test impact on daily life options
    expect(MEDICAL_DROPDOWN_OPTIONS.impactOnDailyLife).toHaveLength(5);
    expect(MEDICAL_DROPDOWN_OPTIONS.impactOnDailyLife.map(opt => opt.value)).toEqual(['None', 'Mild', 'Moderate', 'Severe', 'Complete']);

    // Test medication frequency options
    expect(MEDICAL_DROPDOWN_OPTIONS.medicationFrequency).toHaveLength(10);
    expect(MEDICAL_DROPDOWN_OPTIONS.medicationFrequency.map(opt => opt.value)).toEqual([
      'QD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'PRN', 'STAT'
    ]);

    // Test medication route options
    expect(MEDICAL_DROPDOWN_OPTIONS.medicationRoute).toHaveLength(10);
    expect(MEDICAL_DROPDOWN_OPTIONS.medicationRoute.map(opt => opt.value)).toEqual([
      'Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Rectal', 'Ophthalmic', 'Otic', 'Nasal'
    ]);

    // Test test urgency options
    expect(MEDICAL_DROPDOWN_OPTIONS.testUrgency).toHaveLength(4);
    expect(MEDICAL_DROPDOWN_OPTIONS.testUrgency.map(opt => opt.value)).toEqual([
      'Routine', 'Urgent', 'Emergency', 'STAT'
    ]);

    // Test lab test type options
    expect(MEDICAL_DROPDOWN_OPTIONS.labTestType).toHaveLength(6);
    expect(MEDICAL_DROPDOWN_OPTIONS.labTestType.map(opt => opt.value)).toEqual([
      'Routine', 'Urgent', 'STAT', 'Pre-op', 'Post-op', 'Monitoring'
    ]);
  });
});

describe('Medical Form Integration Tests', () => {
  test('all medical dropdown options have required properties', () => {
    Object.values(MEDICAL_DROPDOWN_OPTIONS).forEach(options => {
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        // description is optional
      });
    });
  });

  test('all medical dropdown options have unique values within each category', () => {
    Object.values(MEDICAL_DROPDOWN_OPTIONS).forEach(options => {
      const values = options.map(opt => opt.value);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });
  });

  test('frequency options include all standard medical abbreviations', () => {
    const frequencyValues = MEDICAL_DROPDOWN_OPTIONS.medicationFrequency.map(opt => opt.value);
    const expectedFrequencies = ['QD', 'BID', 'TID', 'QID'];

    expectedFrequencies.forEach(freq => {
      expect(frequencyValues).toContain(freq);
    });
  });

  test('route options include all common medication administration routes', () => {
    const routeValues = MEDICAL_DROPDOWN_OPTIONS.medicationRoute.map(opt => opt.value);
    const expectedRoutes = ['Oral', 'IV', 'IM', 'SC'];

    expectedRoutes.forEach(route => {
      expect(routeValues).toContain(route);
    });
  });
});
