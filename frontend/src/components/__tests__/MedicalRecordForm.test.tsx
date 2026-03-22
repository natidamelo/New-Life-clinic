import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MedicalRecordForm from '../doctor/nextgen/MedicalRecordForm';
import { AuthContext } from '../../context/AuthContext';

// Mock the required dependencies
jest.mock('../../utils/authToken', () => ({
  getAuthToken: jest.fn(() => 'mock-token')
}));

jest.mock('../../services/medicalRecords', () => ({
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    finalize: jest.fn(),
    getByPatientId: jest.fn()
  },
  MedicalRecordInput: {},
  MedicalRecord: {}
}));

jest.mock('../../services/patientService', () => ({
  getPatientById: jest.fn(() => Promise.resolve({ firstName: 'John', lastName: 'Doe' }))
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    Consumer: ({ children }: { children: React.ReactNode }) => children
  }
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the imported components
jest.mock('../doctor/nextgen/MedicalHistoryDropdown', () => {
  return function MockMedicalHistoryDropdown() {
    return <div data-testid="medical-history-dropdown">Medical History Dropdown</div>;
  };
});

jest.mock('../doctor/ProfessionalPrescriptionForm', () => {
  return function MockProfessionalPrescriptionForm() {
    return <div data-testid="professional-prescription-form">Professional Prescription Form</div>;
  };
});

jest.mock('../doctor/LaboratoryRequestForm', () => {
  return function MockLaboratoryRequestForm() {
    return <div data-testid="laboratory-request-form">Laboratory Request Form</div>;
  };
});

jest.mock('../doctor/ImagingOrderForm', () => {
  return function MockImagingOrderForm() {
    return <div data-testid="imaging-order-form">Imaging Order Form</div>;
  };
});

const mockAuthContext = {
  user: { id: 'doctor-id', firstName: 'Dr.', lastName: 'Smith' },
  login: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: true
};

describe('MedicalRecordForm Component', () => {
  beforeEach(() => {
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue(mockAuthContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders with basic props', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    expect(screen.getByText('New Medical Record')).toBeInTheDocument();
  });

  test('displays chief complaint dropdown fields', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Clinical Characteristics')).toBeInTheDocument();
    });

    // Check that all dropdown fields are present
    expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    expect(screen.getByLabelText('Onset Pattern')).toBeInTheDocument();
    expect(screen.getByLabelText('Progression')).toBeInTheDocument();
    expect(screen.getByLabelText('Impact on Daily Life')).toBeInTheDocument();
  });

  test('severity dropdown has correct options', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.mouseDown(severitySelect);

    expect(screen.getByText('Mild')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });

  test('onset pattern dropdown has correct options', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Onset Pattern')).toBeInTheDocument();
    });

    const onsetSelect = screen.getByLabelText('Onset Pattern');
    fireEvent.mouseDown(onsetSelect);

    expect(screen.getByText('Acute')).toBeInTheDocument();
    expect(screen.getByText('Subacute')).toBeInTheDocument();
    expect(screen.getByText('Chronic')).toBeInTheDocument();
  });

  test('progression dropdown has correct options', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Progression')).toBeInTheDocument();
    });

    const progressionSelect = screen.getByLabelText('Progression');
    fireEvent.mouseDown(progressionSelect);

    expect(screen.getByText('Improving')).toBeInTheDocument();
    expect(screen.getByText('Worsening')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Fluctuating')).toBeInTheDocument();
  });

  test('impact on daily life dropdown has correct options', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Impact on Daily Life')).toBeInTheDocument();
    });

    const impactSelect = screen.getByLabelText('Impact on Daily Life');
    fireEvent.mouseDown(impactSelect);

    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Mild')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  test('dropdowns are disabled in view mode', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" mode="view" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Severity')).toBeDisabled();
    expect(screen.getByLabelText('Onset Pattern')).toBeDisabled();
    expect(screen.getByLabelText('Progression')).toBeDisabled();
    expect(screen.getByLabelText('Impact on Daily Life')).toBeDisabled();
  });

  test('displays all required form steps', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    expect(screen.getByText('Chief Complaint & History')).toBeInTheDocument();
    expect(screen.getByText('Physical Examination')).toBeInTheDocument();
    expect(screen.getByText('Diagnosis & Plan')).toBeInTheDocument();
  });

  test('medical history dropdown is rendered', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('medical-history-dropdown')).toBeInTheDocument();
  });
});

describe('Medical Record Form Data Validation', () => {
  test('form initializes with correct default values', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    // Check that dropdowns have default values
    expect(screen.getByLabelText('Severity')).toHaveValue('Mild');
    expect(screen.getByLabelText('Onset Pattern')).toHaveValue('Acute');
    expect(screen.getByLabelText('Progression')).toHaveValue('Improving');
    expect(screen.getByLabelText('Impact on Daily Life')).toHaveValue('None');
  });

  test('all dropdown options are accessible', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    // Test severity dropdown accessibility
    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.mouseDown(severitySelect);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Close dropdown
    fireEvent.keyDown(document, { key: 'Escape' });

    // Test onset pattern dropdown accessibility
    const onsetSelect = screen.getByLabelText('Onset Pattern');
    fireEvent.mouseDown(onsetSelect);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Close dropdown
    fireEvent.keyDown(document, { key: 'Escape' });

    // Test progression dropdown accessibility
    const progressionSelect = screen.getByLabelText('Progression');
    fireEvent.mouseDown(progressionSelect);
    expect(screen.getAllByRole('option')).toHaveLength(4);

    // Close dropdown
    fireEvent.keyDown(document, { key: 'Escape' });

    // Test impact dropdown accessibility
    const impactSelect = screen.getByLabelText('Impact on Daily Life');
    fireEvent.mouseDown(impactSelect);
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });
});

describe('Medical Record Form Integration Tests', () => {
  test('form handles dropdown value changes correctly', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    // Test changing severity
    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.mouseDown(severitySelect);
    fireEvent.click(screen.getByText('Severe'));
    expect(severitySelect).toHaveValue('Severe');

    // Test changing onset pattern
    const onsetSelect = screen.getByLabelText('Onset Pattern');
    fireEvent.mouseDown(onsetSelect);
    fireEvent.click(screen.getByText('Chronic'));
    expect(onsetSelect).toHaveValue('Chronic');

    // Test changing progression
    const progressionSelect = screen.getByLabelText('Progression');
    fireEvent.mouseDown(progressionSelect);
    fireEvent.click(screen.getByText('Worsening'));
    expect(progressionSelect).toHaveValue('Worsening');

    // Test changing impact
    const impactSelect = screen.getByLabelText('Impact on Daily Life');
    fireEvent.mouseDown(impactSelect);
    fireEvent.click(screen.getByText('Severe'));
    expect(impactSelect).toHaveValue('Severe');
  });

  test('form maintains dropdown state across tab changes', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MedicalRecordForm patientId="patient-123" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    // Change severity
    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.mouseDown(severitySelect);
    fireEvent.click(screen.getByText('Moderate'));
    expect(severitySelect).toHaveValue('Moderate');

    // Switch to physical examination tab
    fireEvent.click(screen.getByText('Physical Examination'));

    // Switch back to chief complaint tab
    fireEvent.click(screen.getByText('Chief Complaint & History'));

    // Check that severity value is maintained
    expect(severitySelect).toHaveValue('Moderate');
  });
});
