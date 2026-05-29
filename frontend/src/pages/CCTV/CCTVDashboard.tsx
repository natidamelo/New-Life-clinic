import React, { useState, useEffect, useCallback, useRef } from 'react';
import './cctv.css';
import HLSPlayer from '../../components/cctv/HLSPlayer';
import CameraManagement from './CameraManagement';
import RecordingsList from './RecordingsList';
import MotionLog from './MotionLog';
import {
  getCameras,
  getAllCamerasStatus,
  startRecording,
  stopRecording,
  deleteCamera,
  getStreamUrl
} from '../../api/cctv';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Camera {
  _id: string;
  name: string;
  room: string;
  location: string;
  status: 'online' | 'offline' | 'unknown';
  streamKey: string;
  recordingEnabled: boolean;
  recordingActive: boolean;
  streamRegistered: boolean;
  lastSeenAt: string | null;
  notes?: string;
  createdAt: string;
}

interface StreamData {
  hlsUrl: string;
  webrtcUrl: string;
  status: string;
}

type ActiveTab = 'live' | 'recordings' | 'events' | 'settings';

// ── Timestamp component ────────────────────────────────────────────────────────
const LiveTimestamp: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="cctv-timestamp">
      {time.toLocaleDateString()} {time.toLocaleTimeString()}
    </span>
  );
};

// ── Status badge ────────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`cctv-status-badge ${status}`}>
    <span className="cctv-status-dot" />
    {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Unknown'}
  </span>
);

// ── Individual camera card ──────────────────────────────────────────────────────
const CameraCard: React.FC<{
  camera: Camera;
  onEdit: (cam: Camera) => void;
  onDelete: (cam: Camera) => void;
  onToggleRecording: (cam: Camera) => void;
  onFullscreen: (cam: Camera, streamData: StreamData | null) => void;
}> = ({ camera, onEdit, onDelete, onToggleRecording, onFullscreen }) => {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStream = async () => {
      try {
        const res = await getStreamUrl(camera._id);
        if (!cancelled && res.success) {
          setStreamData(res.data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingStream(false);
      }
    };
    fetchStream();
    return () => { cancelled = true; };
  }, [camera._id, camera.status]);

  const isOnline = camera.status === 'online';
  const isRecording = camera.recordingActive;

  return (
    <div className={`cctv-camera-card ${camera.status}`}>
      {/* Video area */}
      <div className="cctv-video-wrapper">
        {isOnline && streamData?.hlsUrl ? (
          <HLSPlayer
            src={streamData.hlsUrl}
            autoPlay
            muted
          />
        ) : (
          <div className="cctv-offline-overlay">
            <svg className="cctv-offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="cctv-offline-text">
              {loadingStream ? 'Connecting...' : 'Camera Offline'}
            </span>
          </div>
        )}

        {/* Overlays */}
        <span className="cctv-camera-name-overlay">{camera.name}</span>
        <LiveTimestamp />

        {isRecording && (
          <div className="cctv-rec-badge">
            <span className="cctv-rec-dot" />
            REC
          </div>
        )}

        {/* Fullscreen button */}
        {isOnline && (
          <button
            className="cctv-fullscreen-btn"
            onClick={() => onFullscreen(camera, streamData)}
            title="Fullscreen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        )}
      </div>

      {/* Card footer */}
      <div className="cctv-card-footer">
        <div className="cctv-card-info">
          <div className="cctv-card-name">{camera.name}</div>
          <div className="cctv-card-room">
            📍 {camera.room} {camera.location ? `— ${camera.location}` : ''}
          </div>
        </div>

        <div className="cctv-card-actions">
          <StatusBadge status={camera.status} />

          {/* Recording toggle */}
          <button
            className={`cctv-btn cctv-btn-icon ${isRecording ? 'cctv-btn-danger' : ''}`}
            onClick={() => onToggleRecording(camera)}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            disabled={!isOnline && !isRecording}
          >
            {isRecording ? (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>

          {/* Edit */}
          <button
            className="cctv-btn cctv-btn-icon"
            onClick={() => onEdit(camera)}
            title="Edit Camera"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            className="cctv-btn cctv-btn-icon"
            onClick={() => onDelete(camera)}
            title="Delete Camera"
            style={{ color: 'var(--cctv-red)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Fullscreen viewer ───────────────────────────────────────────────────────────
const FullscreenViewer: React.FC<{
  camera: Camera;
  streamData: StreamData | null;
  onClose: () => void;
}> = ({ camera, streamData, onClose }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => { clearInterval(t); window.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  return (
    <div className="cctv-fullscreen-modal" onClick={onClose}>
      <div className="cctv-fullscreen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StatusBadge status={camera.status} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{camera.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>— {camera.room}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
            {time.toLocaleTimeString()}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
              color: 'white', cursor: 'pointer', padding: '6px', display: 'flex'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, position: 'relative' }}>
        {streamData?.hlsUrl ? (
          <HLSPlayer src={streamData.hlsUrl} autoPlay muted className="" />
        ) : (
          <div className="cctv-offline-overlay" style={{ position: 'absolute', inset: 0 }}>
            <span className="cctv-offline-text">Stream unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────────────────────
const CCTVDashboard: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCamera, setEditCamera] = useState<Camera | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ camera: Camera; stream: StreamData | null } | null>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [go2rtcOnline, setGo2rtcOnline] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      const res = await getCameras();
      if (res.success) setCameras(res.data);
    } catch (err: any) {
      console.error('[CCTV] fetchCameras error:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getAllCamerasStatus();
      if (res.success) {
        setOverviewStats(res.data);
        setGo2rtcOnline(res.data.go2rtcOnline);
        // Update camera statuses
        if (res.data.cameras) {
          setCameras(prev => prev.map(c => {
            const updated = res.data.cameras.find((s: any) => s._id === c._id);
            return updated ? { ...c, status: updated.status, recordingActive: updated.recordingActive } : c;
          }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCameras(), fetchStatus()]);
      setLoading(false);
    };
    init();

    pollRef.current = setInterval(fetchStatus, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchCameras, fetchStatus]);

  const handleToggleRecording = useCallback(async (cam: Camera) => {
    try {
      if (cam.recordingActive) {
        await stopRecording(cam._id);
        showToast(`Recording stopped for ${cam.name}`);
      } else {
        await startRecording(cam._id);
        showToast(`🔴 Recording started for ${cam.name}`);
      }
      await fetchCameras();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Recording action failed', 'error');
    }
  }, [fetchCameras, showToast]);

  const handleDeleteCamera = useCallback(async (cam: Camera) => {
    if (!window.confirm(`Delete camera "${cam.name}"? This cannot be undone.`)) return;
    try {
      await deleteCamera(cam._id);
      showToast(`Camera "${cam.name}" deleted`);
      await fetchCameras();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Delete failed', 'error');
    }
  }, [fetchCameras, showToast]);

  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const offlineCameras = cameras.filter(c => c.status !== 'online').length;
  const activeRecs = cameras.filter(c => c.recordingActive).length;

  return (
    <div className="cctv-dashboard">
      <div className="cctv-content">
        {/* ── Header ──────────────────────────────────── */}
        <div className="cctv-header">
          <div className="cctv-header-left">
            <div className="cctv-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <div className="cctv-title">CCTV Security Center</div>
              <div className="cctv-subtitle">New Life Clinic — Surveillance System</div>
            </div>
          </div>

          <div className="cctv-header-actions">
            {/* go2rtc status */}
            <div className="cctv-system-status">
              <span className={`cctv-system-dot ${go2rtcOnline ? 'go2rtc-online' : ''}`} />
              <span>go2rtc: {go2rtcOnline ? 'Online' : 'Offline'}</span>
            </div>

            <button className="cctv-btn cctv-btn-ghost" onClick={() => { fetchCameras(); fetchStatus(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>

            <button
              className="cctv-btn cctv-btn-primary"
              onClick={() => { setEditCamera(null); setShowAddModal(true); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Camera
            </button>
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────── */}
        <div className="cctv-stats-bar">
          <div className="cctv-stat-card">
            <div className="cctv-stat-label">Total Cameras</div>
            <div className="cctv-stat-value blue">{cameras.length}</div>
          </div>
          <div className="cctv-stat-card">
            <div className="cctv-stat-label">Online</div>
            <div className="cctv-stat-value green">{onlineCameras}</div>
          </div>
          <div className="cctv-stat-card">
            <div className="cctv-stat-label">Offline</div>
            <div className="cctv-stat-value red">{offlineCameras}</div>
          </div>
          <div className="cctv-stat-card">
            <div className="cctv-stat-label">Recording</div>
            <div className="cctv-stat-value" style={{ color: activeRecs > 0 ? 'var(--cctv-recording)' : 'var(--cctv-text-muted)' }}>
              {activeRecs}
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="cctv-tabs">
          {(['live', 'recordings', 'events'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              className={`cctv-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'live' && '📹 Live Feeds'}
              {tab === 'recordings' && '🎞 Recordings'}
              {tab === 'events' && '⚡ Event Log'}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────── */}
        {loading ? (
          <div className="cctv-empty-state">
            <div className="cctv-stream-spinner" style={{ width: 48, height: 48 }} />
            <p className="cctv-empty-desc" style={{ marginTop: 16 }}>Loading camera system...</p>
          </div>
        ) : activeTab === 'live' ? (
          cameras.length === 0 ? (
            <div className="cctv-empty-state">
              <svg className="cctv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <div className="cctv-empty-title">No cameras configured</div>
              <p className="cctv-empty-desc">Add your first EZVIZ camera to start monitoring the clinic.</p>
              <button
                className="cctv-btn cctv-btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => { setEditCamera(null); setShowAddModal(true); }}
              >
                + Add First Camera
              </button>
            </div>
          ) : (
            <div className="cctv-camera-grid">
              {cameras.map(cam => (
                <CameraCard
                  key={cam._id}
                  camera={cam}
                  onEdit={(c) => { setEditCamera(c); setShowAddModal(true); }}
                  onDelete={handleDeleteCamera}
                  onToggleRecording={handleToggleRecording}
                  onFullscreen={(c, s) => setFullscreenData({ camera: c, stream: s })}
                />
              ))}
            </div>
          )
        ) : activeTab === 'recordings' ? (
          <RecordingsList />
        ) : (
          <MotionLog />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────── */}
      {showAddModal && (
        <CameraManagement
          camera={editCamera}
          onClose={() => { setShowAddModal(false); setEditCamera(null); }}
          onSaved={() => {
            setShowAddModal(false);
            setEditCamera(null);
            fetchCameras();
            showToast(editCamera ? 'Camera updated' : 'Camera added successfully');
          }}
        />
      )}

      {fullscreenData && (
        <FullscreenViewer
          camera={fullscreenData.camera}
          streamData={fullscreenData.stream}
          onClose={() => setFullscreenData(null)}
        />
      )}

      {/* ── Toast ───────────────────────────────────────── */}
      {toast && (
        <div className="cctv-toast" style={{
          borderColor: toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'var(--cctv-border-active)'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default CCTVDashboard;
