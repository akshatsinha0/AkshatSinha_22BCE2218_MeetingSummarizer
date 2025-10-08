'use client';

import { useState } from 'react';

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList } };
    const file = form.file.files?.[0];
    if (!file) { alert('Choose an audio file'); return; }
    
    setLoading(true);
    setResult(null);
    
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`${apiBase}/api/process`, { method: 'POST', body: fd });
      if (!res.ok) { 
        alert('Error: ' + (await res.text())); 
        setLoading(false);
        return; 
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:'100vh',padding:'24px'}}>
      <h1 className="bbh-sans-bartle-regular" style={{fontSize:'28px'}}>Meeting Summarizer</h1>
      <form onSubmit={handleSubmit} className="merriweather-500" style={{marginTop:'16px'}}>
        <div className="box" style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <label>Audio file</label>
          <input name="file" type="file" accept="audio/*" disabled={loading} />
          <button type="submit" disabled={loading} style={{padding:'8px 12px',border:'1px solid #444',background:loading?'#555':'#111',color:'#fff',cursor:loading?'wait':'pointer'}}>
            {loading ? 'Processing... Please wait' : 'Upload & Process'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="merriweather-500" style={{marginTop:'16px',padding:'12px',border:'1px solid #333',color:'#888'}}>
          Processing your audio file... This may take 30 seconds to a few minutes depending on file length.
        </div>
      )}
      
      {result && (
        <div style={{marginTop:'16px'}}>
          <h2 className="bbh-sans-bartle-regular" style={{fontSize:'20px',marginBottom:'12px'}}>Results</h2>
          
          <div style={{marginBottom:'16px'}}>
            <h3 className="merriweather-500" style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>Summary</h3>
            <p className="merriweather-500" style={{padding:'12px',border:'1px solid #333',background:'#0a0a0a'}}>{result.summary}</p>
          </div>
          
          <div style={{marginBottom:'16px'}}>
            <h3 className="merriweather-500" style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>Key Decisions</h3>
            <ul className="merriweather-500" style={{padding:'12px',border:'1px solid #333',background:'#0a0a0a',listStyle:'disc',paddingLeft:'32px'}}>
              {result.decisions?.length > 0 ? result.decisions.map((d: string, i: number) => <li key={i}>{d}</li>) : <li>No decisions identified</li>}
            </ul>
          </div>
          
          <div style={{marginBottom:'16px'}}>
            <h3 className="merriweather-500" style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>Action Items</h3>
            <ul className="merriweather-500" style={{padding:'12px',border:'1px solid #333',background:'#0a0a0a',listStyle:'disc',paddingLeft:'32px'}}>
              {result.action_items?.length > 0 ? result.action_items.map((a: string, i: number) => <li key={i}>{a}</li>) : <li>No action items identified</li>}
            </ul>
          </div>
          
          <details style={{marginTop:'16px'}}>
            <summary className="merriweather-500" style={{cursor:'pointer',padding:'8px',border:'1px solid #333',background:'#0a0a0a'}}>View Full Transcript</summary>
            <pre className="merriweather-500" style={{marginTop:'8px',padding:'12px',border:'1px solid #333',whiteSpace:'pre-wrap',background:'#0a0a0a'}}>{result.transcript}</pre>
          </details>
        </div>
      )}
    </main>
  );
}
