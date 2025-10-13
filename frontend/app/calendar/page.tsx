'use client';

import { useState, useEffect } from 'react';

export default function CalendarIntegration() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadUpcomingMeetings() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/calendar/upcoming?max_results=20`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchMeetings() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/calendar/search?query=${encodeURIComponent(searchQuery)}&max_results=20`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="bbh-sans-bartle-regular" style={{ fontSize: '28px' }}>
          Calendar Integration
        </h1>
        <a
          href="/"
          style={{
            padding: '8px 16px',
            border: '1px solid #444',
            background: '#111',
            color: '#fff',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          ← Back to Home
        </a>
      </div>

      <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #333', background: '#0a0a0a' }}>
        <p className="merriweather-500" style={{ marginBottom: '12px', color: '#ccc' }}>
          Connect your Google Calendar to automatically fetch meeting metadata, attendees, and schedule information.
        </p>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={loadUpcomingMeetings}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #444',
              background: loading ? '#555' : '#111',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Load Upcoming Meetings'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchMeetings()}
            placeholder="Search meetings by title..."
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #444',
              background: '#111',
              color: '#fff'
            }}
          />
          <button
            onClick={searchMeetings}
            disabled={loading || !searchQuery.trim()}
            style={{
              padding: '8px 16px',
              border: '1px solid #444',
              background: loading || !searchQuery.trim() ? '#555' : '#111',
              color: '#fff',
              cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', border: '2px solid #a00', background: '#0a0a0a', marginBottom: '16px' }}>
          <p className="merriweather-500" style={{ color: '#f88' }}>
            <strong>Error:</strong> {error}
          </p>
          <p className="merriweather-500" style={{ color: '#ccc', fontSize: '14px', marginTop: '8px' }}>
            Make sure you have set up Google Calendar credentials. See README for setup instructions.
          </p>
        </div>
      )}

      <div style={{ border: '1px solid #333', background: '#0a0a0a' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
          <h2 className="bbh-sans-bartle-regular" style={{ fontSize: '20px' }}>
            Meetings ({meetings.length})
          </h2>
        </div>

        {meetings.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p className="merriweather-500" style={{ color: '#666', fontStyle: 'italic' }}>
              No meetings loaded. Click "Load Upcoming Meetings" to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {meetings.map((meeting, i) => (
              <div
                key={meeting.id || i}
                style={{
                  padding: '16px',
                  borderBottom: i < meetings.length - 1 ? '1px solid #333' : 'none',
                  background: i % 2 === 0 ? '#0a0a0a' : '#111'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 className="merriweather-500" style={{ fontSize: '18px', marginBottom: '8px' }}>
                      {meeting.title}
                    </h3>
                    
                    <div className="merriweather-500" style={{ fontSize: '14px', color: '#aaa', marginBottom: '4px' }}>
                      {formatDateTime(meeting.start)}
                      {meeting.end && ` - ${formatDateTime(meeting.end)}`}
                    </div>

                    {meeting.location && (
                      <div className="merriweather-500" style={{ fontSize: '14px', color: '#aaa', marginBottom: '4px' }}>
                        Location: {meeting.location}
                      </div>
                    )}

                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="merriweather-500" style={{ fontSize: '14px', color: '#aaa', marginBottom: '4px' }}>
                        {meeting.attendees.length} attendee(s): {meeting.attendees.slice(0, 3).map((a: any) => a.name || a.email).join(', ')}
                        {meeting.attendees.length > 3 && ` +${meeting.attendees.length - 3} more`}
                      </div>
                    )}

                    {meeting.description && (
                      <details style={{ marginTop: '8px' }}>
                        <summary className="merriweather-500" style={{ cursor: 'pointer', fontSize: '14px', color: '#888' }}>
                          View description
                        </summary>
                        <p className="merriweather-500" style={{ fontSize: '13px', color: '#ccc', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {meeting.description}
                        </p>
                      </details>
                    )}

                    {(meeting.hangout_link || meeting.meet_link) && (
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={meeting.hangout_link || meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 12px',
                            border: '1px solid #444',
                            background: '#111',
                            color: '#4a9eff',
                            textDecoration: 'none',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>

                  <div style={{ marginLeft: '16px' }}>
                    <button
                      onClick={() => alert(`Link meeting ${meeting.id} to a job (feature coming soon)`)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #444',
                        background: '#111',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Link to Job
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
