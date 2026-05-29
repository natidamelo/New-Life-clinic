import React, { useState, useEffect, useCallback } from 'react';
import { getEvents, acknowledgeEvent } from '../../api/cctv';

interface CameraEvent {
  _id: string;
  cameraId: { _id: string; name: string; room: string } | string;
  eventType: string;
  severity: 'info' | 'warning' | 'alert' | 'critical';
  metadata?: Record<string, any>;
  acknowledged: boolean;
  createdAt: string;
}

const eventIcon = (type: string): { icon: string; className: string } => {
  const map: Record<string, { icon: string; className: string }> = {
    motion_detected:     { icon: '👁️',  className: 'motion'    },
    camera_online:       { icon: '✅',  className: 'online'    },
    camera_offline:      { icon: '❌',  className: 'offline'   },
    recording_started:   { icon: '🔴',  className: 'recording' },
    recording_stopped:   { icon: '⏹️',  className: 'recording' },
    stream_reconnect:    { icon: '🔄',  className: 'info'      },
    ai_person_detected:  { icon: '🚶',  className: 'motion'    },
    ai_intrusion_alert:  { icon: '🚨',  className: 'offline'   },
    ai_face_recognized:  { icon: '🧑',  className: 'info'      },
    manual_snapshot:     { icon: '📸',  className: 'info'      },
  };
  return map[type] || { icon: '📋', className: 'info' };
};

const eventLabel = (type: string): string =>
  type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const MotionLog: React.FC = () => {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (filter) params.eventType = filter;
      const res = await getEvents(params);
      if (res.success) {
        setEvents(res.data);
        setTotal(res.total);
      }
    } catch (err: any) {
      console.error('[CCTV] getEvents error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleAcknowledge = async (eventId: string) => {
    try {
      setAcknowledging(eventId);
      await acknowledgeEvent(eventId);
      setEvents(prev => prev.map(e => e._id === eventId ? { ...e, acknowledged: true } : e));
    } catch {}
    finally { setAcknowledging(null); }
  };

  const getCameraName = (cam: CameraEvent['cameraId']) =>
    typeof cam === 'object' ? cam.name : 'Unknown';
  const getCameraRoom = (cam: CameraEvent['cameraId']) =>
    typeof cam === 'object' ? cam.room : '';

  const eventTypes = [
    '', 'motion_detected', 'camera_online', 'camera_offline',
    'recording_started', 'recording_stopped', 'stream_reconnect',
    'ai_person_detected', 'ai_intrusion_alert'
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="cctv-input"
            style={{ width: 'auto', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
          >
            {eventTypes.map(t => (
              <option key={t} value={t}>{t ? eventLabel(t) : 'All Events'}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.72rem', color: 'var(--cctv-text-muted)' }}>
            {total} event{total !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="cctv-btn cctv-btn-ghost" onClick={fetchEvents}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="cctv-empty-state">
          <div className="cctv-stream-spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : events.length === 0 ? (
        <div className="cctv-empty-state">
          <svg className="cctv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="cctv-empty-title">No events recorded</div>
          <p className="cctv-empty-desc">Events appear here when cameras go online/offline or motion is detected.</p>
        </div>
      ) : (
        <div className="cctv-events-list">
          {events.map(event => {
            const { icon, className } = eventIcon(event.eventType);
            return (
              <div
                key={event._id}
                className="cctv-event-item"
                style={{ opacity: event.acknowledged ? 0.5 : 1 }}
              >
                <div className={`cctv-event-icon ${className}`}>
                  <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                </div>
                <div className="cctv-event-content">
                  <div className="cctv-event-title">{eventLabel(event.eventType)}</div>
                  <div className="cctv-event-meta">
                    📹 {getCameraName(event.cameraId)}
                    {getCameraRoom(event.cameraId) && ` — ${getCameraRoom(event.cameraId)}`}
                    &nbsp;·&nbsp;
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div style={{ marginTop: 3, fontSize: '0.68rem', color: 'var(--cctv-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {JSON.stringify(event.metadata).slice(0, 100)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: event.severity === 'critical' ? 'var(--cctv-red)' :
                      event.severity === 'warning' ? 'var(--cctv-yellow)' : 'var(--cctv-text-muted)'
                  }}>
                    {event.severity}
                  </span>
                  {!event.acknowledged && (
                    <button
                      className="cctv-btn cctv-btn-ghost"
                      style={{ fontSize: '0.68rem', padding: '0.25rem 0.6rem' }}
                      onClick={() => handleAcknowledge(event._id)}
                      disabled={acknowledging === event._id}
                    >
                      {acknowledging === event._id ? '...' : 'Ack'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MotionLog;
