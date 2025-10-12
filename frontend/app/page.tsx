'use client';

import { useState } from 'react';

import { useEffect } from 'react';

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode,setMode]=useState<'async'|'sync'>('async');
  const [models,setModels]=useState<string[]>([]);
  const [selectedModel,setSelectedModel]=useState<string>('gemma3:4b');
  const [enableDiar,setEnableDiar]=useState<boolean>(true);
  const [language,setLanguage]=useState<string>('');
  const [prompt,setPrompt]=useState<string>('');
  const [fileInfo,setFileInfo]=useState<{name:string,size:number,duration:number}|null>(null);

  useEffect(()=>{(async()=>{try{const r=await fetch(`${apiBase}/api/models`);const j=await r.json();setModels((j.models||[]).map((m:any)=>m.name));}catch{}})();},[]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList } };
    const file = form.file.files?.[0];
    if (!file) { alert('Choose an audio file'); return; }
    
    setLoading(true);
    setResult(null);
    
    const fd = new FormData();
    fd.append('file', file);
    fd.append('model', selectedModel);
    fd.append('language', language);
    fd.append('diarization_enabled', String(enableDiar));
    if (prompt) fd.append('prompt', prompt);

    const endpoint = mode==='async' ? `${apiBase}/api/jobs` : `${apiBase}/api/process`;

    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok) { 
        alert('Error: ' + (await res.text())); 
        setLoading(false);
        return; 
      }
      const data = await res.json();
      setResult(data);
      if(mode==='async' && data?.job_id){
        const out=document.getElementById('joblink') as HTMLAnchorElement|null;
        if(out){out.href=`/jobs/${data.job_id}`; out.textContent=`View job ${data.job_id}`;}
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(input: HTMLInputElement){
    const f=input.files?.[0];
    if(!f){setFileInfo(null);return;}
    const url=URL.createObjectURL(f);
    const audio=new Audio(url);
    audio.addEventListener('loadedmetadata',()=>{
      setFileInfo({name:f.name,size:f.size,duration:audio.duration});
    });
  }

  return (
    <main style={{minHeight:'100vh',padding:'24px'}}>
      <h1 className="bbh-sans-bartle-regular" style={{fontSize:'28px'}}>Meeting Summarizer</h1>

      <RecentJobs apiBase={apiBase} />

      <form onSubmit={handleSubmit} className="merriweather-500" style={{marginTop:'16px'}}>
        <div className="box" style={{display:'flex',flexDirection:'column',gap:'8px',padding:'8px',border:'1px solid #333'}}>
          <label>Audio file</label>
          <input name="file" type="file" accept="audio/*" onChange={e=>onFileChange(e.currentTarget)} disabled={loading} />
          {fileInfo && (
            <div className="merriweather-500">
              <div>Name: {fileInfo.name}</div>
              <div>Size: {(fileInfo.size/1024/1024).toFixed(2)} MB</div>
              <div>Duration: {isFinite(fileInfo.duration)?fileInfo.duration.toFixed(1):'?'} s</div>
            </div>
          )}

          <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
            <label><input type="radio" name="mode" checked={mode==='async'} onChange={()=>setMode('async')} /> Async</label>
            <label><input type="radio" name="mode" checked={mode==='sync'} onChange={()=>setMode('sync')} /> Sync</label>
          </div>

          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <label>Model</label>
            <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)}>
              {[selectedModel,...models.filter(m=>m!==selectedModel)].map(m=>(<option key={m} value={m}>{m}</option>))}
            </select>
          </div>

          <details>
            <summary>Advanced settings</summary>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'8px'}}>
              <label><input type="checkbox" checked={enableDiar} onChange={()=>setEnableDiar(v=>!v)} /> Enable diarization</label>
              <label>Language (optional) <input value={language} onChange={e=>setLanguage(e.target.value)} placeholder="en" /></label>
              <label>Custom prompt <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} /></label>
            </div>
          </details>

          <button type="submit" disabled={loading} style={{padding:'8px 12px',border:'1px solid #444',background:loading?'#555':'#111',color:'#fff',cursor:loading?'wait':'pointer'}}>
            {loading ? 'Submitting...' : 'Start'}
          </button>
        </div>
      </form>

      <a id="joblink" className="merriweather-500" style={{display:'inline-block',marginTop:'12px'}} href="#"></a>

      {result && mode==='sync' && (
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

function RecentJobs({apiBase}:{apiBase:string}){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{(async()=>{try{const r=await fetch(`${apiBase}/api/jobs`);setItems(await r.json());}catch{}})();},[]);
  return (
    <div className="box" style={{marginTop:'8px',border:'1px solid #333',padding:'8px'}}>
      <div className="bbh-sans-bartle-regular" style={{fontSize:'20px'}}>Recent uploads</div>
      <ul>
        {items.map((j:any)=>(<li key={j.job_id}><a href={`/jobs/${j.job_id}`}>{j.job_id}</a> – {j.status} {j.stage?`(${j.stage})`:''}</li>))}
      </ul>
    </div>
  );
}
