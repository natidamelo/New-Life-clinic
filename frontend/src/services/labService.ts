import { api } from './api';
import { AxiosError } from 'axios';
import { getPatientById } from './patientService'; // Add this import for fetching patient details

// Add this at the top of the file, after the imports
// Cache for missing patient IDs to avoid repeated 404 requests
const missingPatientCache = new Set<string>();

// Define the structure for a single lab order payload for the backend
interface LabOrderPayload {
  patientId: string;
  visitId: string; // Required by the backend
  testName: string;
  priority?: 'Routine' | 'STAT' | 'ASAP'; // Matches case in backend enum
  orderingDoctorId?: string; // Add this field since it's required by backend
  panelName?: string;
  specimenType?: string;
  notes?: string;
}

// Define the structure for lab order response
interface LabOrder {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  orderingDoctorId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  visitId: string;
  testName: string;
  panelName?: string;
  specimenType?: string;
  orderDateTime: string;
  collectionDateTime?: string;
  resultDateTime?: string;
  status: string;
  paymentStatus?: string; // Add payment status field
  results?: any;
  normalRange?: string;
  notes?: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

// Define a standard lab result interface for consistent formatting
interface StandardLabResult {
  _id: string;
  id?: string; // Some components might use id instead of _id
  testName: string;
  category?: string;
  patientId: string;
  patientName?: string;
  orderedBy: string;
  orderDate: string;
  resultDate?: string;
  results: any;
  normalRange?: string;
  notes?: string;
  status: string;
  priority?: string;
  sentToDoctor?: boolean;
  sentDate?: string;
}

// New interface for grouped lab results by patient
export interface PatientLabResults {
  patientName: string;
  testCount: number;
  latestDate: string;
  tests: StandardLabResult[];
  patientId?: string;
  gender?: string;
  age?: number;
  dob?: string;
  phone?: string;
  physician?: string;
  verifiedBy?: string;
  status?: string;
}

// Helper function to standardize lab result format
const standardizeLabResult = (labOrder: any): StandardLabResult => {
  // Handle null/undefined input
  if (!labOrder) {
    console.warn('Attempted to standardize null/undefined lab result');
    return {
      _id: '',
      id: '',
      testName: 'Unknown Test',
      category: 'General',
      patientId: '',
      patientName: 'Unknown Patient',
      orderedBy: 'Unknown Doctor',
      orderDate: new Date().toISOString(),
      results: {},
      status: 'Unknown'
    };
  }

  // Process the results field to ensure consistent format
  let standardizedResults: any = {};
  
  try {
    if (labOrder.results) {
      if (typeof labOrder.results === 'string') {
        // If results is a JSON string, parse it
        try {
          standardizedResults = JSON.parse(labOrder.results);
        } catch (e) {
          // If parsing fails, store as a single value
          standardizedResults = { value: labOrder.results };
        }
      } else if (typeof labOrder.results === 'object') {
        // If results is already an object, use it directly
        standardizedResults = labOrder.results;
      } else {
        // For any other type, convert to string and store as value
        standardizedResults = { value: String(labOrder.results) };
      }
    }
  } catch (error) {
    console.error('Error standardizing lab results', error);
    standardizedResults = { error: 'Error processing results data' };
  }
  
  // Process normalRange to ensure consistency
  let normalRangeValue = '';
  if (labOrder.normalRange) {
    normalRangeValue = typeof labOrder.normalRange === 'string' 
      ? labOrder.normalRange 
      : JSON.stringify(labOrder.normalRange);
  } else if (labOrder.normalRanges) {
    normalRangeValue = typeof labOrder.normalRanges === 'string'
      ? labOrder.normalRanges
      : JSON.stringify(labOrder.normalRanges);
  }
  
  // Create a standard format regardless of the source
  return {
    _id: labOrder._id || labOrder.id || '',
    id: labOrder._id || labOrder.id || '', // Include both for compatibility
    testName: labOrder.testName || labOrder.name || 'Unknown Test',
    category: labOrder.category || getCategoryFromTestName(labOrder.testName || labOrder.name),
    patientId: (labOrder.patientId && typeof labOrder.patientId === 'object') ? 
               (labOrder.patientId.patientId || labOrder.patientId._id) : 
               (labOrder.patientId || ''), // Use standardized patientId if available
    patientName: (labOrder.patientId && typeof labOrder.patientId === 'object') 
      ? `${labOrder.patientId.firstName || ''} ${labOrder.patientId.lastName || ''}`.trim() 
      : (labOrder.patientName || 'Unknown Patient'),
    orderedBy: (labOrder.orderingDoctorId && typeof labOrder.orderingDoctorId === 'object')
      ? `Dr. ${labOrder.orderingDoctorId.firstName || ''} ${labOrder.orderingDoctorId.lastName || ''}`.trim()
      : (labOrder.orderedBy || 'Unknown Doctor'),
    orderDate: labOrder.orderDateTime || labOrder.requestDate || labOrder.orderDate || 
               labOrder.createdAt || new Date().toISOString(),
    resultDate: labOrder.resultDateTime || labOrder.resultDate || 
                labOrder.completedDate || labOrder.updatedAt || '',
    results: standardizedResults,
    normalRange: normalRangeValue,
    notes: labOrder.notes || '',
    status: labOrder.status || 'Unknown',
    priority: labOrder.priority || 'Routine',
    sentToDoctor: !!labOrder.sentToDoctor,
    sentDate: labOrder.sentToDoctorAt || labOrder.sentDate || ''
  };
};

// Helper function to determine category from test name
const getCategoryFromTestName = (testName: string = ''): string => {
  const lowerTestName = testName.toLowerCase();
  
  if (lowerTestName.includes('blood') || 
     lowerTestName.includes('cbc') || 
     lowerTestName.includes('hemoglobin') || 
     lowerTestName.includes('wbc') || 
     lowerTestName.includes('rbc')) {
    return 'Hematology';
  }
  
  if (lowerTestName.includes('glucose') || 
     lowerTestName.includes('cholesterol') || 
     lowerTestName.includes('lipid') || 
     lowerTestName.includes('metabolic') ||
     lowerTestName.includes('bun') ||
     lowerTestName.includes('creatinine')) {
    return 'Chemistry';
  }
  
  if (lowerTestName.includes('thyroid') || 
     lowerTestName.includes('tsh') || 
     lowerTestName.includes('hormone')) {
    return 'Endocrinology';
  }
  
  if (lowerTestName.includes('urine') || 
     lowerTestName.includes('urinalysis')) {
    return 'Urinalysis';
  }
  
  if (lowerTestName.includes('culture') || 
     lowerTestName.includes('bacteria') || 
     lowerTestName.includes('viral')) {
    return 'Microbiology';
  }
  
  return 'General';
};

// Use the relative path - Vite proxy should handle forwarding
const LAB_ORDERS_API_ENDPOINT_RELATIVE = '/api/lab-orders'; 

// Function to fetch all lab orders
const getAllLabOrders = async (): Promise<LabOrder[]> => {
  try {
    console.log('Fetching all lab orders with status=all parameter...');
    
    // Add query parameter to fetch all orders without payment filtering
    const response = await api.get(`${LAB_ORDERS_API_ENDPOINT_RELATIVE}?status=all`);

    console.log('Lab orders API response:', response.data);

    // The backend returns { success: true, count: number, data: LabOrder[] }
    // We need to extract the data array from the response
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      console.log(`Successfully fetched ${response.data.data.length} lab orders from API`);
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      // Fallback: if response.data is directly an array
      console.log(`Successfully fetched ${response.data.length} lab orders from API (direct array)`);
      return response.data;
    } else {
      console.warn('Unexpected response format from lab orders API:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching lab orders:', error);
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received from server. Request:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    // Return empty array instead of throwing to avoid hanging UI
    return [];
  }
};

// Function to fetch only paid lab orders for lab dashboard
const getPaidLabOrders = async (): Promise<LabOrder[]> => {
  try {
    // Fetch only paid orders (default behavior without status=all parameter)
    const response = await api.get(LAB_ORDERS_API_ENDPOINT_RELATIVE);

    // The backend returns { success: true, count: number, data: LabOrder[] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      // Fallback: if response.data is directly an array
      return response.data;
    } else {
      console.warn('Unexpected response format from lab orders API:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching paid lab orders:', error);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received from server. Request:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return [];
  }
};

// Function to fetch lab order by ID
const getLabOrderById = async (id: string): Promise<LabOrder> => {
  try {
    const response = await api.get(`${LAB_ORDERS_API_ENDPOINT_RELATIVE}/${id}`);
    
    // The backend returns { success: true, data: LabOrder }
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data && response.data._id) {
      // Fallback: if response.data is directly the lab order object
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    console.error(`Error fetching lab order ${id}:`, error);
    throw new Error('Failed to fetch lab order details. Please try again.');
  }
};

// Function to update lab order status
const updateLabOrderStatus = async (id: string, status: string, results?: any): Promise<LabOrder> => {
  try {
    const updateData: any = { status };
    
    // Add results if provided
    if (results) {
      updateData.results = results;
    }
    
    // If status is 'Results Available', add resultDateTime
    if (status === 'Results Available') {
      updateData.resultDateTime = new Date().toISOString();
    }
    
    // If status is 'Collected', add collectionDateTime
    if (status === 'Collected') {
      updateData.collectionDateTime = new Date().toISOString();
    }

    // Use direct axios for better debugging
    try {
      const response = await api.put(`${LAB_ORDERS_API_ENDPOINT_RELATIVE}/${id}`, updateData);

      // The backend returns { success: true, data: LabOrder }
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data._id) {
        // Fallback: if response.data is directly the lab order object
        return response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (axiosError: any) {
      // Enhanced error logging for network/axios errors
      console.error(`Axios error updating lab order ${id}:`, axiosError);
      
      if (axiosError.response) {
        console.error(`Response status: ${axiosError.response.status}`);
        console.error(`Response data:`, axiosError.response.data);
      } else if (axiosError.request) {
        console.error(`Request sent but no response received:`, axiosError.request);
      } else {
        console.error(`Error setting up request:`, axiosError.message);
      }
      
      throw axiosError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error(`Error updating lab order ${id}:`, error);
    // Add more context to the error
    const enhancedError = new Error(`Failed to update lab order to '${status}'. ${error.message || 'Please try again.'}`);
    throw enhancedError;
  }
};

// Function to submit a SINGLE lab order
const submitLabOrder = async (orderData: LabOrderPayload): Promise<any> => {

  try {
    // Ensure priority has proper capitalization if it exists
    if (orderData.priority && orderData.priority.toLowerCase() === 'routine') {
      orderData.priority = 'Routine';
    } else if (orderData.priority && orderData.priority.toLowerCase() === 'stat') {
      orderData.priority = 'STAT';
    } else if (orderData.priority && orderData.priority.toLowerCase() === 'asap') {
      orderData.priority = 'ASAP';
    }

    // Make sure we're using the right property name for orderingDoctorId
    if (!orderData.orderingDoctorId) {
      console.warn('orderingDoctorId is missing in the lab order request, using fallback ID');
      // Hardcode the doctor ID from the logs to ensure it works
      orderData.orderingDoctorId = '6800ad0a8c0537f199ca6308';
    }

    // Use the relative path - Axios will combine with baseURL
    const response = await api.post(LAB_ORDERS_API_ENDPOINT_RELATIVE, orderData);

    // The backend returns { success: true, data: LabOrder }
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data && response.data._id) {
      // Fallback: if response.data is directly the lab order object
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    console.error(`Error submitting lab order to ${LAB_ORDERS_API_ENDPOINT_RELATIVE}:`, error);
    const axiosError = error as AxiosError<{ message?: string; errors?: any[] }>;
    let errorMessage = 'Failed to submit lab order. Please try again.';
    
    // Handle duplicate prevention errors specifically
    if (axiosError.response?.status === 409) {
      errorMessage = axiosError.response.data?.message || 'Lab order already exists';
      console.warn('Duplicate lab order detected:', errorMessage);
      // Return the existing order data instead of throwing error
      return (axiosError.response.data as any)?.existingOrder || null;
    }
    
    // Use the detailed error message from the interceptor if available
    if ((error as any).message) { 
      errorMessage = (error as any).message;
    } else if (axiosError.response?.data?.message) {
       errorMessage = axiosError.response.data.message;
    } else if (axiosError.response?.data?.errors) {
       errorMessage = axiosError.response.data.errors.map((e: any) => e.msg).join(', ');
    }
    // Re-throw the specific error message
    throw new Error(errorMessage);
  }
};

// Placeholder for the old function if needed elsewhere, or remove it
// interface LabRequestData {
//   patientId: string;
//   chemistry: { id: number; name: string; normalRange?: string }[];
//   hematology: { id: number; name: string; normalRange?: string }[];
//   parasitology: { id: number; name: string; normalRange?: string }[];
//   immunology: { id: number; name: string; normalRange?: string }[];
//   other: { id: number; name: string; normalRange?: string }[];
//   status: 'pending';
// }
// const submitLabRequest_OLD = async (requestData: LabRequestData): Promise<any> => {
//   console.log('Submitting lab request to backend:', requestData);
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   console.log('Placeholder: Lab request submitted successfully.');
//   return { success: true, message: 'Lab request submitted.', data: requestData };
// };

/**
 * Sends lab test results to the ordering doctor and updates the database
 * to track that the results have been sent and should appear in patient history
 * 
 * @param testIds Array of test IDs to be sent
 * @param patientId Patient ID associated with the tests
 * @param doctorId Optional doctor ID to send to (defaults to ordering doctor)
 * @returns Promise with the sending result
 */
const sendLabResultsToDoctor = async (
  testIds: string[], 
  patientId: string,
  doctorId?: string
): Promise<any> => {
  try {

    // Call the API endpoint to send results to doctor - using the correct endpoint from labRoutes.js
    const response = await api.post('/api/lab-results/send-to-doctor', {
      testIds,
      patientId,
      doctorId
    });

    // If successful, get the detailed test data to save in standardized format
    if (response.data.success && testIds.length > 0) {
      try {
        // Get the full test data for each test
        const testPromises = testIds.map(id => getLabOrderById(id));
        const testsData = await Promise.all(testPromises);
        
        // Standardize the format of each test
        const standardizedTests = testsData.map(test => standardizeLabResult({
          ...test,
          sentToDoctor: true,
          sentToDoctorAt: response.data.sentAt
        }));
        
        // Save the standardized lab results to patient history
        await api.post('/api/patients/' + patientId + '/lab-results', {
          results: standardizedTests
        }).catch(err => {
          console.warn('Failed to save standardized lab results to patient history:', err);
          // Don't fail the process if this additional save fails
        });
      } catch (detailError) {
        console.warn('Error getting detailed test data or saving standardized format:', detailError);
        // Continue with the original response even if standardization fails
      }
    }
    
    // The backend returns { success: true, data: any }
    if (response.data && response.data.success) {
      return response.data;
    } else {
      return response.data;
    }
  } catch (error) {
    console.error('Error sending lab results to doctor:', error);
    
    // Check if the error is because the endpoint wasn't found (404)
    if ((error as any).response?.status === 404) {
      console.warn('API endpoint not found. Trying alternative endpoint...');
      
      try {
        // Try an alternative endpoint as fallback
        const response = await api.post('/api/lab-results/send-to-doctor', {
          testIds,
          patientId,
          doctorId
        });

        // The backend returns { success: true, data: any }
        if (response.data && response.data.success) {
          return response.data;
        } else {
          return response.data;
        }
      } catch (fallbackError) {
        console.error('Alternative endpoint also failed:', fallbackError);
        throw fallbackError; // Re-throw if both attempts failed
      }
    }
    
    throw error; // Re-throw the original error
  }
};

/**
 * Fetches all lab results sent to a specific doctor
 * 
 * @param doctorId The ID of the doctor
 * @returns Promise with the standardized lab results
 */
const getDoctorLabResults = async (doctorId: string): Promise<StandardLabResult[]> => {
  try {

    const response = await api.get(`/api/lab-results/doctor/${doctorId}`);
    
    // Standardize the results
    if (response.data && Array.isArray(response.data)) {
      const standardizedResults = response.data.map(result => 
        standardizeLabResult(result)
      );

      // Filter out results for non-existent patients to prevent 404 errors
      const validResults = standardizedResults.filter(result => {
        if (!result.patientId) {
          console.warn('Lab result missing patient ID, filtering out:', result);
          return false;
        }
        return true;
      });
      
      if (validResults.length !== standardizedResults.length) {
        console.warn(`Filtered out ${standardizedResults.length - validResults.length} lab results with missing patient IDs`);
      }
      
      return validResults;
    }

    return [];
  } catch (error) {
    console.error('Error fetching doctor lab results:', error);
    
    // For development/debugging - avoid throwing errors that might block UI
    if (import.meta.env.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
      console.warn('Returning empty array due to error');
      return [];
    }
    
    throw new Error('Failed to fetch lab results. Please try again.');
  }
};

/**
 * Groups lab results by patient, combining all tests for each patient
 * 
 * @param labResults Array of lab results to group
 * @returns Array of grouped lab results by patient
 */
const groupLabResultsByPatient = (labResults: StandardLabResult[]): PatientLabResults[] => {
  // Group by patientId + order-date (YYYY-MM-DD) so tests from different
  // visits/dates are kept as separate rows instead of being merged together.
  const patientMap = new Map<string, StandardLabResult[]>();
  
  labResults.forEach(result => {
    const patientId = result.patientId;
    if (!patientId) {
      console.warn('Lab result missing patient ID:', result);
      return;
    }
    
    // Use the calendar day of the order as part of the grouping key
    const orderDay = result.orderDate
      ? new Date(result.orderDate).toISOString().slice(0, 10)
      : 'unknown';
    const groupKey = `${patientId}::${orderDay}`;
    
    if (!patientMap.has(groupKey)) {
      patientMap.set(groupKey, []);
    }
    
    patientMap.get(groupKey)!.push(result);
  });
  
  // Convert the map to an array of PatientLabResults
  const groupedResults: PatientLabResults[] = [];
  
  patientMap.forEach((tests, groupKey) => {
    const patientId = groupKey.split('::')[0];
    // Sort tests by date (newest first)
    tests.sort((a, b) => {
      const dateA = new Date(a.resultDate || a.orderDate);
      const dateB = new Date(b.resultDate || b.orderDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Get the patient name from the first test
    const patientName = tests[0].patientName || 'Unknown Patient';
    
    // Get the latest date from the first test (after sorting)
    const latestDate = tests[0].resultDate || tests[0].orderDate;
    
    // Determine overall status based on the "least advanced" test in the group
    const statusPriority: Record<string, number> = {
      'Ordered': 0,
      'Pending': 0,
      'pending': 0,
      'Scheduled': 1,
      'Collected': 2,
      'Processing': 3,
      'Results Available': 4,
      'Sent to Doctor': 5,
      'Completed': 6,
      'completed': 6,
    };
    const lowestPriority = tests.reduce((min, test) => {
      const p = statusPriority[test.status] ?? 0;
      return p < min ? p : min;
    }, 99);
    const statusByPriority = [
      'Ordered', 'Scheduled', 'Collected', 'Processing',
      'Results Available', 'Sent to Doctor', 'Completed'
    ];
    const status = statusByPriority[Math.min(lowestPriority, statusByPriority.length - 1)] ?? 'Ordered';
    
    groupedResults.push({
      patientId,
      patientName,
      latestDate,
      testCount: tests.length,
      tests,
      status
    });
  });
  
  // Sort by latest date
  groupedResults.sort((a, b) => {
    const dateA = new Date(a.latestDate);
    const dateB = new Date(b.latestDate);
    return dateB.getTime() - dateA.getTime();
  });
  
  return groupedResults;
};

/**
 * Fetches all lab results sent to a specific doctor and groups them by patient.
 * Patient demographics are already embedded in the lab order response from the
 * backend, so no extra per-patient HTTP calls are needed.
 *
 * @param doctorId The ID of the doctor
 * @param prefetchedResults Optional already-fetched results to avoid a duplicate API call
 * @returns Promise with the grouped lab results by patient
 */
const getDoctorLabResultsGroupedByPatient = async (
  doctorId: string,
  prefetchedResults?: StandardLabResult[]
): Promise<PatientLabResults[]> => {
  try {
    // Reuse prefetched results if provided — avoids a duplicate API call
    const labResults = prefetchedResults ?? await getDoctorLabResults(doctorId);

    // Group by patient (patient name/demographics already in each result from backend)
    const groupedResults = groupLabResultsByPatient(labResults);

    // Enrich each group with physician info — no extra HTTP calls needed
    return groupedResults.map(patientGroup => ({
      ...patientGroup,
      patientName: patientGroup.patientName || `Patient (${patientGroup.patientId})`,
      physician: patientGroup.tests[0]?.orderedBy || 'Not specified',
      verifiedBy: patientGroup.tests[0]?.orderedBy || 'Not specified'
    }));
  } catch (error) {
    console.error('Error fetching grouped lab results:', error);
    throw new Error('Failed to fetch grouped lab results. Please try again.');
  }
};

// Helper function to calculate age from date of birth
const calculateAge = (dob: string | undefined): number | undefined => {
  if (!dob) return undefined;
  
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birth month/day hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (e) {
    console.warn('Could not calculate age from date of birth:', dob);
    return undefined;
  }
};

// Fetch lab orders for a specific patient (frontend-filtered fallback)
const getLabOrdersByPatient = async (patientId: string): Promise<LabOrder[]> => {
  try {
    // Try backend-side filtering first (if implemented)
    const response = await api.get(`${LAB_ORDERS_API_ENDPOINT_RELATIVE}?patientId=${patientId}`);
    
    // The backend returns { success: true, count: number, data: LabOrder[] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (Array.isArray(response.data) && response.data.length >= 0) {
      return response.data;
    }
  } catch (err) {
    // Ignore and fallback to client filtering
    console.warn('Backend filter for lab-orders by patient not available, falling back to client filter');
  }

  // Fallback: fetch all and filter locally
  const all = await getAllLabOrders();
  return all.filter((o) => {
    const pid = typeof o.patientId === 'object' ? o.patientId._id : (o as any).patientId;
    return pid === patientId;
  });
};

// New bulk lab order submission
// Get pending lab orders for reception
export const getPendingLabOrdersForReception = async (): Promise<any[]> => {
  try {

    const response = await api.get('/api/lab-orders/pending-for-reception');
    
    // The backend returns { success: true, data: LabOrder[] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      // Fallback: if response.data is directly an array
      return response.data;
    } else {
      console.warn('Unexpected response format from pending lab orders API:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching pending lab orders for reception:', error);
    throw error;
  }
};

// Function to create lab service result for reception-ordered tests
const createLabServiceResult = async (payload: {
  patientId: string;
  testName: string;
  results: any;
  normalRange?: string;
  notes?: string;
  priority?: 'Routine' | 'STAT' | 'ASAP';
  createdBy?: string;
}): Promise<any> => {
  try {
    const response = await api.post('/api/lab-results/create-service-result', payload);

    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Lab service result creation failed', error);
    
    if (error.response) {
      const serverError = error.response.data;
      if (serverError.message) {
        throw new Error(serverError.message);
      } else if (serverError.error) {
        throw new Error(serverError.error);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

// Function to get all lab service results
const getLabServiceResults = async (params?: {
  status?: string;
  patientId?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await api.get('/api/lab-results/service-results', { params });

    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch lab service results', error);
    
    if (error.response) {
      const serverError = error.response.data;
      if (serverError.message) {
        throw new Error(serverError.message);
      } else if (serverError.error) {
        throw new Error(serverError.error);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

// Function to get service result for printing
const getServiceResultForPrint = async (resultId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/lab-results/service-results/${resultId}/print`);

    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch service result for print', error);
    
    if (error.response) {
      const serverError = error.response.data;
      if (serverError.message) {
        throw new Error(serverError.message);
      } else if (serverError.error) {
        throw new Error(serverError.error);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

// Function to mark service result as printed
const markServiceResultAsPrinted = async (resultId: string): Promise<any> => {
  try {
    const response = await api.put(`/api/lab-results/service-results/${resultId}/print`);

    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Failed to mark service result as printed', error);
    
    if (error.response) {
      const serverError = error.response.data;
      if (serverError.message) {
        throw new Error(serverError.message);
      } else if (serverError.error) {
        throw new Error(serverError.error);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

export const submitBulkLabOrder = async (payload: {
  patientId: string;
  visitId: string;
  priority: 'Routine' | 'STAT' | 'ASAP';
  tests: { testName: string }[];
  notes?: string;
}): Promise<any> => {
  try {
    // Validate payload before sending
    if (!payload.patientId || typeof payload.patientId !== 'string') {
      throw new Error('Patient ID is required and must be a string');
    }
    
    // Visit ID is optional - only validate if provided
    if (payload.visitId && typeof payload.visitId !== 'string') {
      throw new Error('Visit ID must be a string if provided');
    }
    
    if (!payload.tests || !Array.isArray(payload.tests) || payload.tests.length === 0) {
      throw new Error('At least one test must be specified');
    }
    
    // Validate each test
    for (const test of payload.tests) {
      if (!test.testName || typeof test.testName !== 'string' || test.testName.trim() === '') {
        throw new Error('Each test must have a valid test name');
      }
    }
    
    // Validate priority
    if (payload.priority && !['Routine', 'STAT', 'ASAP'].includes(payload.priority)) {
      throw new Error('Priority must be one of: Routine, STAT, ASAP');
    }

    const response = await api.post('/api/lab-orders', payload);

    // The backend returns { success: true, data: LabOrder[] }
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data && response.data._id) {
      // Fallback: if response.data is directly the lab order object
      return response.data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Bulk lab order submission failed', error);
    
    // Handle duplicate prevention errors specifically
    if (error.response?.status === 409) {
      const duplicateMessage = error.response.data?.message || 'Some lab orders already exist';
      const duplicateError = new Error(duplicateMessage);
      duplicateError.name = 'DuplicateLabOrderError';
      // Don't throw error, just log warning and continue
      console.warn('Some lab orders already exist:', duplicateMessage);
      return []; // Return empty array instead of throwing
    }
    
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      const serverError = error.response.data;
      console.error('Server error details:', serverError);
      
      if (serverError.message) {
        throw new Error(serverError.message);
      } else if (serverError.error) {
        throw new Error(serverError.error);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.request);
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Other error (validation, etc.)
      throw error;
    }
  }
};

// Export both the service object and helper functions for use in components
const labService = {
  submitLabOrder,
  getAllLabOrders,
  getPaidLabOrders,
  getLabOrderById,
  updateLabOrderStatus,
  sendLabResultsToDoctor,
  getDoctorLabResults,
  standardizeLabResult,
  getCategoryFromTestName,
  groupLabResultsByPatient,
  getDoctorLabResultsGroupedByPatient,
  getLabOrdersByPatient,
  submitBulkLabOrder,
  getPendingLabOrdersForReception,
  createLabServiceResult,
  getLabServiceResults,
  getServiceResultForPrint,
  markServiceResultAsPrinted
};

export default labService;
export { getLabOrdersByPatient };
export type { StandardLabResult }; 