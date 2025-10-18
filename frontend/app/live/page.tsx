'use client';

import { useState, useRef, useEffect } from 'react';

export default function LiveTranscription() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const wsBase = apiBase.replace('http', 'ws');
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<Array<{text: string, timestamp: string}>>([]);
  const [status, setStatus] = useState('Ready to start');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Connect WebSocket
      const ws = new WebSocket(`${wsBase}/ws/transcribe/${sessionId}`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setStatus('Connected. Recording...');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          setTranscript(prev => [...prev, { text: data.text, timestamp: data.timestamp }]);
        } else if (data.type === 'status') {
          setStatus(data.message);
        } else if (data.type === 'error') {
          setStatus(`Error: ${data.message}`);
        }
      };
      
      ws.onerror = () => {
        setStatus('WebSocket error');
      };
      
      ws.onclose = () => {
        setStatus('Disconnected');
      };
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              data: base64
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorder.start(3000); // Send chunks every 3 seconds
      setIsRecording(true);
      
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
      wsRef.current.close();
    }
    
    setIsRecording(false);
    setStatus('Recording stopped');
  }

  function clearTranscript() {
    setTranscript([]);
  }

  function downloadTranscript() {
    const text = transcript.map(t => t.text).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-transcript-${sessionId}.txt`;
    a.click();
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px' }}>
      <h1 className="bbh-sans-bartle-regular" style={{ fontSize: '28px', marginBottom: '16px' }}>
        Live Transcription
      </h1>

      <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #333', background: '#0a0a0a' }}>
        <div className="merriweather-500" style={{ marginBottom: '12px' }}>
          Status: {status}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              style={{
                padding: '12px 24px',
                border: '1px solid #444',
                background: '#111',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: '12px 24px',
                border: '1px solid #444',
                background: 'rgb(191,30,45)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Stop Recording
            </button>
          )}
          
          <button
            onClick={clearTranscript}
            disabled={transcript.length === 0}
            style={{
              padding: '12px 24px',
              border: '1px solid #444',
              background: transcript.length === 0 ? '#333' : '#111',
              color: '#fff',
              cursor: transcript.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Clear
          </button>
          
          <button
            onClick={downloadTranscript}
            disabled={transcript.length === 0}
            style={{
              padding: '12px 24px',
              border: '1px solid #444',
              background: transcript.length === 0 ? '#333' : '#111',
              color: '#fff',
              cursor: transcript.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Download
          </button>
          
          <a
            href="/"
            style={{
              padding: '12px 24px',
              border: '1px solid #444',
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            ← Back to Upload
          </a>
        </div>
      </div>

      <div style={{ border: '1px solid #333', padding: '16px', background: '#0a0a0a', minHeight: '400px' }}>
        <h2 className="bbh-sans-bartle-regular" style={{ fontSize: '20px', marginBottom: '12px' }}>
          Transcript ({transcript.length} segments)
        </h2>
        
        {transcript.length === 0 ? (
          <p className="merriweather-500" style={{ color: '#666', fontStyle: 'italic' }}>
            No transcript yet. Start recording to see live transcription...
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transcript.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  border: '1px solid #444',
                  background: '#111',
                  animation: 'fadeIn 0.3s ease-in'
                }}
              >
                <div className="merriweather-500" style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
                <div className="merriweather-500" style={{ fontSize: '16px' }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
