import React, { useState, useEffect } from 'react';
import { addCamera, editCamera as editCameraApi } from '../../api/cctv';

interface Camera {
  _id: string;
  name: string;
  room: string;
  location?: string;
  notes?: string;
  recordingEnabled?: boolean;
}

interface Props {
  camera: Camera | null;
  onClose: () => void;
  onSaved: () => void;
}

const CameraManagement: React.FC<Props> = ({ camera, onClose, onSaved }) => {
  const isEdit = !!camera;

  const [form, setForm] = useState({
    name: camera?.name || '',
    rtspUrl: '',
    room: camera?.room || '',
    location: camera?.location || '',
    notes: camera?.notes || '',
    recordingEnabled: camera?.recordingEnabled || false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRtsp, setShowRtsp] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Camera name is required'); return; }
    if (!form.room.trim()) { setError('Room is required'); return; }
    if (!isEdit && !form.rtspUrl.trim()) { setError('RTSP URL is required'); return; }

    try {
      setSaving(true);
      if (isEdit) {
        const payload: any = {
          name: form.name,
          room: form.room,
          location: form.location,
          notes: form.notes,
          recordingEnabled: form.recordingEnabled
        };
        if (form.rtspUrl.trim()) payload.rtspUrl = form.rtspUrl;
        await editCameraApi(camera!._id, payload);
      } else {
        await addCamera({
          name: form.name,
          rtspUrl: form.rtspUrl,
          room: form.room,
          location: form.location,
          notes: form.notes
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save camera');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="cctv-modal-overlay" onClick={onClose}>
      <div className="cctv-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="cctv-modal-title" style={{ margin: 0 }}>
            {isEdit ? '✏️ Edit Camera' : '📹 Add Camera'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--cctv-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>

        {/* EZVIZ hint */}
        {!isEdit && (
          <div style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 8,
            padding: '0.65rem 0.875rem',
            marginBottom: '1rem',
            fontSize: '0.72rem',
            color: 'var(--cctv-text-secondary)',
            lineHeight: 1.6
          }}>
            <strong style={{ color: 'var(--cctv-accent)' }}>EZVIZ RTSP format:</strong><br />
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', opacity: 0.8 }}>
              rtsp://admin:password@192.168.x.x:554/Streaming/Channels/101
            </code>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="cctv-form-group">
            <label className="cctv-label">Camera Name *</label>
            <input
              className="cctv-input"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Reception Camera"
              autoFocus
            />
          </div>

          <div className="cctv-form-group">
            <label className="cctv-label">
              RTSP URL {isEdit ? '(leave blank to keep current)' : '*'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="cctv-input"
                type={showRtsp ? 'text' : 'password'}
                name="rtspUrl"
                value={form.rtspUrl}
                onChange={handleChange}
                placeholder="rtsp://admin:password@192.168.x.x:554/..."
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowRtsp(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--cctv-text-muted)',
                  cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px'
                }}
              >
                {showRtsp ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="cctv-form-group">
              <label className="cctv-label">Room / Area *</label>
              <input
                className="cctv-input"
                type="text"
                name="room"
                value={form.room}
                onChange={handleChange}
                placeholder="e.g. Reception"
              />
            </div>
            <div className="cctv-form-group">
              <label className="cctv-label">Location (optional)</label>
              <input
                className="cctv-input"
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Main Entrance"
              />
            </div>
          </div>

          <div className="cctv-form-group">
            <label className="cctv-label">Notes (optional)</label>
            <input
              className="cctv-input"
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any notes about this camera..."
            />
          </div>

          {isEdit && (
            <div className="cctv-form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="recordingEnabled"
                name="recordingEnabled"
                checked={form.recordingEnabled}
                onChange={handleChange}
                style={{ width: 14, height: 14, accentColor: 'var(--cctv-accent)' }}
              />
              <label htmlFor="recordingEnabled" className="cctv-label" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: '0.8rem', cursor: 'pointer' }}>
                Enable recording for this camera
              </label>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '0.6rem 0.875rem',
              fontSize: '0.78rem',
              color: 'var(--cctv-red)',
              marginBottom: '1rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="cctv-btn cctv-btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="cctv-btn cctv-btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? (
                <><span className="cctv-stream-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
              ) : (
                isEdit ? '💾 Update Camera' : '📹 Add Camera'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CameraManagement;
