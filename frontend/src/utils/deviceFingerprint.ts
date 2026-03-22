/**
 * Device Fingerprinting Utility
 * Creates a unique fingerprint for each device based on multiple characteristics
 * This prevents hash copying between devices
 */

export interface DeviceFingerprint {
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  vendor: string;
  colorDepth: number;
  pixelRatio: number;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  plugins: string;
  canvas: string;
  webgl: string;
}

/**
 * Create a comprehensive device fingerprint (with fallbacks for all devices)
 */
export async function createDeviceFingerprint(): Promise<DeviceFingerprint> {
  try {
    const fingerprint: DeviceFingerprint = {
      userAgent: navigator.userAgent || 'unknown',
      screen: `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      language: navigator.language || 'en',
      platform: navigator.platform || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemory: (navigator as any).deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      vendor: navigator.vendor || 'unknown',
      colorDepth: screen.colorDepth || 24,
      pixelRatio: window.devicePixelRatio || 1,
      cookiesEnabled: navigator.cookieEnabled !== undefined ? navigator.cookieEnabled : true,
      doNotTrack: (navigator as any).doNotTrack || null,
      plugins: getPluginsString(),
      canvas: await getCanvasFingerprint(),
      webgl: getWebGLFingerprint()
    };

    return fingerprint;
  } catch (error) {
    console.error('Error creating fingerprint, using minimal fallback:', error);
    // Return minimal fingerprint if full one fails
    return {
      userAgent: navigator.userAgent || 'unknown',
      screen: `${screen.width}x${screen.height}x24`,
      timezone: 'UTC',
      language: 'en',
      platform: navigator.platform || 'unknown',
      hardwareConcurrency: 1,
      maxTouchPoints: 0,
      vendor: 'unknown',
      colorDepth: 24,
      pixelRatio: 1,
      cookiesEnabled: true,
      doNotTrack: null,
      plugins: 'none',
      canvas: 'fallback',
      webgl: 'fallback'
    };
  }
}

/**
 * Hash the device fingerprint to create a unique identifier (with fallback)
 */
export async function hashDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
  try {
    const fingerprintString = JSON.stringify(fingerprint);
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Hashing failed, using simple hash:', error);
    // Simple fallback hash using timestamp and random
    const simple = `${fingerprint.userAgent}_${Date.now()}_${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < simple.length; i++) {
      const char = simple.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
}

/**
 * Get plugins as a string
 */
function getPluginsString(): string {
  try {
    const plugins = Array.from(navigator.plugins || [])
      .map(p => p.name)
      .sort()
      .join(',');
    return plugins || 'none';
  } catch (error) {
    return 'error';
  }
}

/**
 * Create canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    canvas.width = 200;
    canvas.height = 50;
    
    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device ID', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device ID', 4, 17);
    
    // Get canvas data
    const dataUrl = canvas.toDataURL();
    
    // Hash the canvas data
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 32);
  } catch (error) {
    return 'canvas-error';
  }
}

/**
 * Get WebGL fingerprint
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}|${renderer}`;
  } catch (error) {
    return 'webgl-error';
  }
}

/**
 * Get current location (requires permission) - with shorter timeout for mobile
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    // Set timeout to auto-resolve after 5 seconds to not block registration
    const timeout = setTimeout(() => {
      console.warn('Location timeout - proceeding without location');
      resolve(null);
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        clearTimeout(timeout);
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 5000, // Reduced from 10s to 5s
        maximumAge: 30000 // Allow cached location
      }
    );
  });
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Compare two device fingerprints for similarity
 * Returns a score from 0 (completely different) to 1 (identical)
 */
export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
  const keys = Object.keys(fp1) as (keyof DeviceFingerprint)[];
  let matches = 0;
  let total = 0;

  for (const key of keys) {
    total++;
    if (fp1[key] === fp2[key]) {
      matches++;
    }
  }

  return matches / total;
}

/**
 * Check if device fingerprint is valid (not likely spoofed)
 */
export function isValidFingerprint(fingerprint: DeviceFingerprint): boolean {
  // Check for suspicious values that indicate fingerprint spoofing
  
  // User agent should not be empty
  if (!fingerprint.userAgent || fingerprint.userAgent === 'unknown') {
    return false;
  }

  // Screen resolution should be reasonable
  const screenParts = fingerprint.screen.split('x');
  if (screenParts.length !== 3) return false;
  const width = parseInt(screenParts[0]);
  const height = parseInt(screenParts[1]);
  if (width < 320 || height < 240 || width > 7680 || height > 4320) {
    return false;
  }

  // Hardware concurrency should be reasonable (1-128 cores)
  if (fingerprint.hardwareConcurrency < 1 || fingerprint.hardwareConcurrency > 128) {
    return false;
  }

  // Canvas and WebGL should not be error values
  if (fingerprint.canvas === 'canvas-error' && fingerprint.webgl === 'webgl-error') {
    return false;
  }

  return true;
}

