import { api } from './api'; // Assuming your base api instance is exported from api.ts

// Define the structure of the vitals data expected by the backend
interface VitalsData {
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  bloodSugar?: string;
  oxygenSaturation?: string;
  pain?: string;
  height?: string;
  weight?: string;
  bmi?: string;
  // timestamp will be added by backend
}

const visitService = {
  /**
   * Adds a set of vital signs to a specific visit.
   * @param visitId - The ID of the visit document.
   * @param vitalsData - The vital signs data to add.
   * @returns The updated vitals array from the visit document.
   */
  async addVitals(visitId: string, vitalsData: VitalsData): Promise<any> {
    try {
      console.log(`Sending vitals to visit ${visitId}:`, vitalsData);
      // Use the base 'api' instance directly
      const response = await api.post(`/api/visits/${visitId}/vitals`, vitalsData);
      console.log('Add vitals API response:', response.data);
      return response.data; // Backend route returns the updated vitals array
    } catch (error) {
      console.error(`Error adding vitals to visit ${visitId}:`, error);
      // Re-throw the structured error from the interceptor if available
      throw error;
    }
  },

  /**
   * Gets the latest active visit for a specific patient.
   * @param patientId - The ID of the patient.
   * @returns The latest active visit document.
   */
  async getLatestActiveVisit(patientId: string): Promise<any> { // Define return type more specifically if needed
    try {
      console.log(`Fetching latest active visit for patient ${patientId}...`);
      const response = await api.get(`/api/visits/patient/${patientId}/latest-active`);
      console.log('Latest active visit response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching latest active visit for patient ${patientId}:`, error);
      // Instead of returning mock data, throw the error to be handled by the component
      throw error;
    }
  },

  // Add other visit-related service functions here later if needed
  // e.g., getVisitById, getActiveVisitForPatient, updateVisitStatus, etc.
};

export default visitService; 