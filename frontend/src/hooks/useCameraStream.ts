import { useState, useEffect, useRef, useCallback } from 'react';
import { getStreamUrl, checkCameraStatus } from '../api/cctv';

interface CameraStreamState {
  hlsUrl: string | null;
  webrtcUrl: string | null;
  status: 'online' | 'offline' | 'unknown' | 'loading';
  error: string | null;
  lastChecked: Date | null;
}

interface UseCameraStreamOptions {
  pollIntervalMs?: number;   // how often to poll status (default: 15 000 ms)
  autoCheckStatus?: boolean; // whether to probe go2rtc status (default: true)
}

export function useCameraStream(
  cameraId: string | null,
  options: UseCameraStreamOptions = {}
) {
  const { pollIntervalMs = 15000, autoCheckStatus = true } = options;

  const [state, setState] = useState<CameraStreamState>({
    hlsUrl: null,
    webrtcUrl: null,
    status: 'loading',
    error: null,
    lastChecked: null
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchStream = useCallback(async () => {
    if (!cameraId) return;
    try {
      const res = await getStreamUrl(cameraId);
      if (!mountedRef.current) return;
      if (res.success) {
        setState(prev => ({
          ...prev,
          hlsUrl: res.data.hlsUrl,
          webrtcUrl: res.data.webrtcUrl,
          status: res.data.status || 'online',
          error: null,
          lastChecked: new Date()
        }));
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        status: 'offline',
        error: err?.response?.data?.message || err.message || 'Failed to reach camera',
        lastChecked: new Date()
      }));
    }
  }, [cameraId]);

  const probeStatus = useCallback(async () => {
    if (!cameraId || !autoCheckStatus) return;
    try {
      const res = await checkCameraStatus(cameraId);
      if (!mountedRef.current) return;
      if (res.success) {
        setState(prev => ({
          ...prev,
          status: res.data.status,
          lastChecked: new Date()
        }));
      }
    } catch {
      // Silent fail — status stays as-is
    }
  }, [cameraId, autoCheckStatus]);

  useEffect(() => {
    mountedRef.current = true;
    if (!cameraId) return;

    fetchStream();

    intervalRef.current = setInterval(() => {
      probeStatus();
    }, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraId, fetchStream, probeStatus, pollIntervalMs]);

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));
    fetchStream();
  }, [fetchStream]);

  return { ...state, refresh };
}
