'use client';

import { useState, useEffect } from 'react';

const LANGUAGES = [
  {code:'',name:'Auto-detect'},
  {code:'en',name:'English'},{code:'es',name:'Spanish'},{code:'fr',name:'French'},
  {code:'de',name:'German'},{code:'it',name:'Italian'},{code:'pt',name:'Portuguese'},
  {code:'ru',name:'Russian'},{code:'zh',name:'Chinese'},{code:'ja',name:'Japanese'},
  {code:'ko',name:'Korean'},{code:'ar',name:'Arabic'},{code:'hi',name:'Hindi'},
  {code:'bn',name:'Bengali'},{code:'pa',name:'Punjabi'},{code:'te',name:'Telugu'},
  {code:'mr',name:'Marathi'},{code:'ta',name:'Tamil'},{code:'ur',name:'Urdu'},
  {code:'gu',name:'Gujarati'},{code:'kn',name:'Kannada'},{code:'ml',name:'Malayalam'},
  {code:'nl',name:'Dutch'},{code:'tr',name:'Turkish'},{code:'pl',name:'Polish'},
  {code:'uk',name:'Ukrainian'},{code:'vi',name:'Vietnamese'},{code:'th',name:'Thai'},
  {code:'id',name:'Indonesian'},{code:'ms',name:'Malay'},{code:'fa',name:'Persian'},
  {code:'he',name:'Hebrew'},{code:'sv',name:'Swedish'},{code:'no',name:'Norwegian'},
  {code:'da',name:'Danish'},{code:'fi',name:'Finnish'},{code:'cs',name:'Czech'},
  {code:'ro',name:'Romanian'},{code:'hu',name:'Hungarian'},{code:'el',name:'Greek'},
];

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
  const [showLangPanel,setShowLangPanel]=useState(false);
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(()=>{
    (async()=>{try{const r=await fetch(`${apiBase}/api/models`);const j=await r.json();setModels((j.models||[]).map((m:any)=>m.name));}catch{}})();
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark'|'light' || 'dark';
    setTheme(savedTheme);
    document.body.style.background = savedTheme === 'dark' ? '#000' : '#fff';
    document.body.style.color = savedTheme === 'dark' ? '#fff' : '#000';
  },[]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Ctrl/Cmd + K: Toggle shortcuts panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      // Ctrl/Cmd + T: Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggleTheme();
      }
      // Ctrl/Cmd + L: Go to live transcription
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        window.location.href = '/live';
      }
      // Escape: Close panels
      if (e.key === 'Escape') {
        setShowLangPanel(false);
        setShowShortcuts(false);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [theme]);

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.style.background = newTheme === 'dark' ? '#000' : '#fff';
    document.body.style.color = newTheme === 'dark' ? '#fff' : '#000';
  }

  const colors = theme === 'dark' ? {
    bg: '#000',
    bgAlt: '#0a0a0a',
    border: '#333',
    borderAlt: '#444',
    text: '#fff',
    textAlt: '#888',
    textMuted: '#666',
    button: '#111',
    buttonHover: '#222',
    buttonDisabled: '#555',
    accent: '#4a9eff'
  } : {
    bg: '#fff',
    bgAlt: '#f5f5f5',
    border: '#ddd',
    borderAlt: '#ccc',
    text: '#000',
    textAlt: '#666',
    textMuted: '#999',
    button: '#f0f0f0',
    buttonHover: '#e0e0e0',
    buttonDisabled: '#ccc',
    accent: '#0066cc'
  };

  useEffect(()=>{(async()=>{try{const r=await fetch(`${apiBase}/api/models`);const j=await r.json();setModels((j.models||[]).map((m:any)=>m.name));}catch{}})();},[]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList } };
    const files = form.file.files;
    if (!files || files.length === 0) { alert('Choose audio file(s)'); return; }
    
    setLoading(true);
    setResult(null);
    
    // Batch processing if multiple files
    if (files.length > 1) {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append('files', files[i]);
      }
      fd.append('model', selectedModel);
      fd.append('language', language);
      fd.append('diarization_enabled', String(enableDiar));
      
      try {
        const res = await fetch(`${apiBase}/api/jobs/batch`, { method: 'POST', body: fd });
        if (!res.ok) { 
          alert('Error: ' + (await res.text())); 
          setLoading(false);
          return; 
        }
        const data = await res.json();
        alert(`Batch upload successful! ${data.count} files queued.`);
        window.location.reload();
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Single file processing
    const file = files[0];
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
    <main style={{minHeight:'100vh',padding:'24px',background:colors.bg,color:colors.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <h1 className="bbh-sans-bartle-regular" style={{fontSize:'28px'}}>Meeting Summarizer</h1>
        <div style={{display:'flex',gap:'12px'}}>
          <button
            onClick={toggleTheme}
            style={{padding:'8px 16px',border:`1px solid ${colors.border}`,background:colors.button,color:colors.text,cursor:'pointer'}}
            title="Toggle theme (Ctrl+T)"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            style={{padding:'8px 16px',border:`1px solid ${colors.border}`,background:colors.button,color:colors.text,cursor:'pointer'}}
            title="Keyboard shortcuts (Ctrl+K)"
          >
            ⌨️
          </button>
          <a
            href="/live"
            style={{padding:'8px 16px',border:`1px solid ${colors.border}`,background:colors.button,color:colors.text,textDecoration:'none',display:'inline-block'}}
            title="Live transcription (Ctrl+L)"
          >
            🎤 Live
          </a>
        </div>
      </div>

      {showShortcuts && (
        <>
          <div 
            style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:999}}
            onClick={() => setShowShortcuts(false)}
          />
          <div style={{
            position:'fixed',
            top:'50%',
            left:'50%',
            transform:'translate(-50%,-50%)',
            background:colors.bgAlt,
            border:`2px solid ${colors.border}`,
            padding:'24px',
            zIndex:1000,
            minWidth:'400px'
          }}>
            <h2 className="bbh-sans-bartle-regular" style={{fontSize:'20px',marginBottom:'16px'}}>Keyboard Shortcuts</h2>
            <div className="merriweather-500" style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Toggle shortcuts</span>
                <kbd style={{padding:'4px 8px',border:`1px solid ${colors.border}`,background:colors.button}}>Ctrl+K</kbd>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Toggle theme</span>
                <kbd style={{padding:'4px 8px',border:`1px solid ${colors.border}`,background:colors.button}}>Ctrl+T</kbd>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Live transcription</span>
                <kbd style={{padding:'4px 8px',border:`1px solid ${colors.border}`,background:colors.button}}>Ctrl+L</kbd>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Close panels</span>
                <kbd style={{padding:'4px 8px',border:`1px solid ${colors.border}`,background:colors.button}}>Esc</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              style={{marginTop:'16px',padding:'8px 16px',border:`1px solid ${colors.border}`,background:colors.button,color:colors.text,cursor:'pointer',width:'100%'}}
            >
              Close
            </button>
          </div>
        </>
      )}

      <RecentJobs apiBase={apiBase} colors={colors} />

      <form onSubmit={handleSubmit} className="merriweather-500" style={{marginTop:'16px'}}>
        <div className="box" style={{display:'flex',flexDirection:'column',gap:'8px',padding:'8px',border:`1px solid ${colors.border}`,background:colors.bgAlt}}>
          <label>Audio file(s) - Select multiple for batch processing</label>
          <input name="file" type="file" accept="audio/*" multiple onChange={e=>onFileChange(e.currentTarget)} disabled={loading} />
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
              
              <div style={{position:'relative'}}>
                <label>Language (optional)</label>
                <div 
                  onClick={()=>setShowLangPanel(true)}
                  style={{
                    padding:'8px',
                    border:'1px solid #444',
                    background:'#111',
                    cursor:'pointer',
                    marginTop:'4px'
                  }}
                >
                  {LANGUAGES.find(l=>l.code===language)?.name || 'Auto-detect'}
                </div>
                
                {showLangPanel && (
                  <>
                    <div 
                      style={{
                        position:'fixed',
                        top:0,
                        left:0,
                        right:0,
                        bottom:0,
                        background:'rgba(0,0,0,0.5)',
                        zIndex:999
                      }}
                      onClick={()=>setShowLangPanel(false)}
                    />
                    <div style={{
                      position:'fixed',
                      top:'50%',
                      left:'50%',
                      transform:'translate(-50%,-50%)',
                      display:'flex',
                      alignItems:'center',
                      zIndex:1000
                    }}>
                      <svg style={{position:'absolute',width:'100%',height:'100%',pointerEvents:'none',left:'-50%',top:0}} viewBox="0 0 800 600">
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" fill="#888" />
                          </marker>
                        </defs>
                        <line x1="200" y1="300" x2="380" y2="20" stroke="#888" strokeWidth="2" markerEnd="url(#arrowhead)" />
                        <line x1="200" y1="300" x2="380" y2="580" stroke="#888" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      </svg>
                      
                      <div style={{
                        width:'0',
                        height:'0',
                        borderTop:'20px solid transparent',
                        borderBottom:'20px solid transparent',
                        borderRight:'20px solid #333',
                        marginRight:'-1px'
                      }}/>
                      <div style={{
                        width:'400px',
                        maxHeight:'500px',
                        overflowY:'auto',
                        border:'2px solid #333',
                        background:'#0a0a0a',
                        animation:'slideIn 0.2s ease-out'
                      }}>
                        <div style={{
                          padding:'12px',
                          borderBottom:'1px solid #333',
                          fontSize:'18px',
                          fontWeight:'bold',
                          textAlign:'center',
                          fontStyle:'italic'
                        }} className="bbh-sans-bartle-regular">
                          LANGUAGE OPTIONS
                        </div>
                        <div style={{padding:'8px'}}>
                          {LANGUAGES.map(lang=>(
                            <div
                              key={lang.code}
                              onClick={()=>{setLanguage(lang.code);setShowLangPanel(false);}}
                              style={{
                                padding:'10px',
                                border:'1px solid #333',
                                marginBottom:'4px',
                                cursor:'pointer',
                                background:language===lang.code?'#222':'#111',
                                textAlign:'center'
                              }}
                              className="merriweather-500"
                            >
                              {lang.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <label>Custom prompt <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} /></label>
            </div>
          </details>

          <button type="submit" disabled={loading} style={{padding:'8px 12px',border:`1px solid ${colors.border}`,background:loading?colors.buttonDisabled:colors.button,color:colors.text,cursor:loading?'wait':'pointer'}}>
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
            <p className="merriweather-500" style={{padding:'12px',border:`1px solid ${colors.border}`,background:colors.bgAlt}}>{result.summary}</p>
          </div>
          <div style={{marginBottom:'16px'}}>
            <h3 className="merriweather-500" style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>Key Decisions</h3>
            <ul className="merriweather-500" style={{padding:'12px',border:`1px solid ${colors.border}`,background:colors.bgAlt,listStyle:'disc',paddingLeft:'32px'}}>
              {result.decisions?.length > 0 ? result.decisions.map((d: string, i: number) => <li key={i}>{d}</li>) : <li>No decisions identified</li>}
            </ul>
          </div>
          <div style={{marginBottom:'16px'}}>
            <h3 className="merriweather-500" style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>Action Items</h3>
            <ul className="merriweather-500" style={{padding:'12px',border:`1px solid ${colors.border}`,background:colors.bgAlt,listStyle:'disc',paddingLeft:'32px'}}>
              {result.action_items?.length > 0 ? result.action_items.map((a: string, i: number) => <li key={i}>{a}</li>) : <li>No action items identified</li>}
            </ul>
          </div>
          <details style={{marginTop:'16px'}}>
            <summary className="merriweather-500" style={{cursor:'pointer',padding:'8px',border:`1px solid ${colors.border}`,background:colors.bgAlt}}>View Full Transcript</summary>
            <pre className="merriweather-500" style={{marginTop:'8px',padding:'12px',border:`1px solid ${colors.border}`,whiteSpace:'pre-wrap',background:colors.bgAlt}}>{result.transcript}</pre>
          </details>
        </div>
      )}
    </main>
  );
}

function RecentJobs({apiBase, colors}:{apiBase:string, colors:any}){
  const [items,setItems]=useState<any[]>([]);
  const [open,setOpen]=useState(false);
  useEffect(()=>{(async()=>{try{const r=await fetch(`${apiBase}/api/jobs`);setItems(await r.json());}catch{}})();},[]);
  
  function timeAgo(isoDate:string){
    const now=new Date().getTime();
    const then=new Date(isoDate+'Z').getTime();
    const diff=Math.floor((now-then)/1000);
    if(diff<60)return 'just now';
    if(diff<3600)return `${Math.floor(diff/60)}m ago`;
    if(diff<86400)return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }
  
  return (
    <details className="box" style={{marginTop:'8px',border:`1px solid ${colors.border}`,padding:'8px',background:colors.bgAlt}} open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary className="bbh-sans-bartle-regular" style={{fontSize:'20px',cursor:'pointer'}}>Recent uploads ({items.length})</summary>
      <ul className="merriweather-500" style={{marginTop:'8px',listStyle:'none',display:'flex',flexDirection:'column',gap:'4px'}}>
        {items.length===0 && <li style={{color:colors.textMuted}}>No recent uploads</li>}
        {items.map((j:any)=>(
          <li key={j.job_id} style={{padding:'8px',border:`1px solid ${colors.border}`,background:colors.button}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{flex:1}}>
                <a href={`/jobs/${j.job_id}`} style={{color:colors.accent,fontSize:'15px'}}>
                  {j.filename || 'audio file'} • {timeAgo(j.created_at)}
                </a>
                <div style={{fontSize:'11px',color:colors.textMuted,marginTop:'2px'}}>
                  {j.job_id.slice(0,8)}...
                </div>
              </div>
              <div style={{fontSize:'13px',color:colors.textAlt,textAlign:'right'}}>
                {j.status} {j.stage?`(${j.stage})`:''} {j.progress?` ${(j.progress*100).toFixed(0)}%`:''}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
