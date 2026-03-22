import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAuthHeader, enableDevMode } from '../services/auth';

// Enable development mode for testing
enableDevMode();

// Get auth headers for all requests
const getConfig = () => ({
  headers: {
    ...getAuthHeader()
  }
});

export const getInventoryItem = (itemId) => axios.get(`${API_BASE_URL}/api/inventory/${itemId}`, getConfig());
export const decrementInventory = (itemId, quantity) => axios.post(`${API_BASE_URL}/api/inventory/${itemId}/decrement`, { quantity }, getConfig()); 