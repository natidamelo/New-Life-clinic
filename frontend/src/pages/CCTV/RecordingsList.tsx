import React, { useState, useEffect, useCallback } from 'react';
import { getRecordings, deleteRecording } from '../../api/cctv';

interface Recording {
  _id: string;
  cameraId: { _id: string; name: string; room: string } | string;
  startTime: string;
  endTime: string | null;
  filePath: string;
  fileSize: number;
  duration: number;
  status: 'recording' | 'completed' | 'failed' | 'deleted';
  triggeredBy?: { firstName: string; lastName: string } | null;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDuration = (seconds: number): string => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const statusColor = (status: string) => ({
  recording: 'var(--cctv-red)',
  completed: 'var(--cctv-green)',
  failed: 'var(--cctv-yellow)',
  deleted: 'var(--cctv-text-muted)'
}[status] || 'var(--cctv-text-muted)');

const RecordingsList: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRecordings({ page, limit: 20 });
      if (res.success) {
        setRecordings(res.data);
        setTotal(res.total);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  const handleDelete = async (rec: Recording) => {
    if (!window.confirm('Delete this recording permanently?')) return;
    try {
      setDeleting(rec._id);
      await deleteRecording(rec._id);
      await fetchRecordings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const getCameraName = (cam: Recording['cameraId']) =>
    typeof cam === 'object' ? cam.name : 'Unknown';
  const getCameraRoom = (cam: Recording['cameraId']) =>
    typeof cam === 'object' ? cam.room : '';

  if (loading) {
    return (
      <div className="cctv-empty-state">
        <div className="cctv-stream-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="cctv-empty-state">
        <p style={{ color: 'var(--cctv-red)', fontSize: '0.85rem' }}>⚠️ {error}</p>
        <button className="cctv-btn cctv-btn-ghost" style={{ marginTop: 12 }} onClick={fetchRecordings}>
          Retry
        </button>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="cctv-empty-state">
        <svg className="cctv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5-3.75c.621 0 1.125.504 1.125 1.125v6c0 .621-.504 1.125-1.125 1.125H8.25" />
        </svg>
        <div className="cctv-empty-title">No recordings yet</div>
        <p className="cctv-empty-desc">Start recording from a camera card in the Live Feeds tab.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--cctv-text-muted)' }}>
          {total} recording{total !== 1 ? 's' : ''} total
        </span>
        <button className="cctv-btn cctv-btn-ghost" onClick={fetchRecordings}>
          🔄 Refresh
        </button>
      </div>

      <div className="cctv-table-wrapper">
        <table className="cctv-table">
          <thead>
            <tr>
              <th>Camera</th>
              <th>Room</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Size</th>
              <th>Status</th>
              <th>File</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recordings.map(rec => (
              <tr key={rec._id}>
                <td style={{ fontWeight: 600 }}>{getCameraName(rec.cameraId)}</td>
                <td style={{ color: 'var(--cctv-text-muted)' }}>{getCameraRoom(rec.cameraId)}</td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
                  {new Date(rec.startTime).toLocaleString()}
                </td>
                <td>{formatDuration(rec.duration)}</td>
                <td>{formatBytes(rec.fileSize)}</td>
                <td>
                  <span style={{
                    color: statusColor(rec.status),
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}>
                    {rec.status === 'recording' && '🔴 '}
                    {rec.status}
                  </span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--cctv-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rec.filePath.split(/[/\\]/).pop()}
                </td>
                <td>
                  {rec.status !== 'recording' && (
                    <button
                      className="cctv-btn cctv-btn-icon"
                      onClick={() => handleDelete(rec)}
                      disabled={deleting === rec._id}
                      title="Delete recording"
                      style={{ color: 'var(--cctv-red)' }}
                    >
                      {deleting === rec._id ? '...' : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="cctv-btn cctv-btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: 'var(--cctv-text-muted)' }}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button className="cctv-btn cctv-btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordingsList;
