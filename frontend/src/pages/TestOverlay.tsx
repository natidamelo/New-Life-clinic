import React from 'react';
import AttendanceOverlay from '../components/AttendanceOverlay';

const TestOverlay: React.FC = () => {
  return (
    <AttendanceOverlay>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Test Page Content</h1>
        <p>If you can read this clearly and click buttons, the overlay is NOT working.</p>
        <p>If this is blurred and you see a check-in overlay, it IS working.</p>
        <button 
          onClick={() => alert('Button clicked!')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Test Button (Should NOT be clickable if overlay is working)
        </button>
      </div>
    </AttendanceOverlay>
  );
};

export default TestOverlay;
