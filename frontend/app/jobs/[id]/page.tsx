'use client';

import { useEffect, useState, use } from 'react';

export default function JobView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [data,setData]=useState<any>(null);
  const [summary,setSummary]=useState<any>(null);
  const [segments,setSegments]=useState<any[]>([]);
  const [err,setErr]=useState<string>('');
  const [filter,setFilter]=useState('');
  const [rename,setRename]=useState<Record<string,string>>({});

  useEffect(()=>{
    const t=setInterval(async()=>{
      try{
        const r=await fetch(`${apiBase}/api/jobs/${id}`);
        if(!r.ok){ setErr(await r.text()); return; }
        const j=await r.json(); setData(j);
        if(j.status==='done' || j.status==='error') {
          clearInterval(t);
          // fetch summary json
          if(j.summary_path){ 
            try{ 
              const summaryUrl = j.summary_path.startsWith('http') ? j.summary_path : `${apiBase}${j.summary_path}`;
              const s=await (await fetch(summaryUrl)).json(); 
              setSummary(s);
            }catch(e){ console.error('Failed to load summary:', e); } 
          }
          if(j.segments_path){ 
            try{ 
              const segmentsUrl = j.segments_path.startsWith('http') ? j.segments_path : `${apiBase}${j.segments_path}`;
              const sg=await (await fetch(segmentsUrl)).json(); 
              setSegments(sg.segments||[]);
            }catch(e){ console.error('Failed to load segments:', e); } 
          }
        }
      }catch(e:any){ setErr(String(e)); }
    },1000);
    return ()=> clearInterval(t);
  },[id]);

  async function exportPdf(){ await fetch(`${apiBase}/api/jobs/${id}/export/pdf`).then(r=>r.json()).then(j=>window.open(j.pdf,'_blank')); }
  async function exportDocx(){ await fetch(`${apiBase}/api/jobs/${id}/export/docx`).then(r=>r.json()).then(j=>window.open(j.docx,'_blank')); }

  const speakers=Array.from(new Set(segments.map(s=>s[0]).filter(Boolean)));
  const filtered = segments.filter(s=>!filter || (s[1]||'').toLowerCase().includes(filter.toLowerCase()));

  return (
    <main style={{minHeight:'100vh',padding:'24px'}}>
      <h1 className="bbh-sans-bartle-regular" style={{fontSize:'24px'}}>Job {id}</h1>
      {err && <pre style={{color:'tomato'}}>{err}</pre>}
      <div className="merriweather-500" style={{marginTop:'8px'}}>Status: {data?.status} {data?.stage?`(${data.stage})`:''} {data?.progress?` ${(data.progress*100).toFixed(0)}%`:''}</div>

      {data?.input_path && (
        <div style={{marginTop:'16px',padding:'12px',border:'1px solid #333',background:'#0a0a0a'}}>
          <h3 className="merriweather-500" style={{fontSize:'16px',marginBottom:'8px'}}>Audio</h3>
          <div style={{border:'1px solid #444',padding:'4px',background:'#111'}}>
            <audio 
              controls 
              src={data.input_path.startsWith('http') ? data.input_path : `${apiBase}${data.input_path}`}
              style={{width:'100%',display:'block'}}
            />
          </div>
        </div>
      )}

      {summary && (
        <section style={{marginTop:'16px'}}>
          <h2 className="bbh-sans-bartle-regular" style={{fontSize:'20px'}}>Summary</h2>
          <p className="merriweather-500" style={{padding:'12px',border:'1px solid #333'}}>{summary.summary}</p>
          <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
            <button onClick={exportPdf} style={{border:'1px solid #333',padding:'8px'}}>Export PDF</button>
            <button onClick={exportDocx} style={{border:'1px solid #333',padding:'8px'}}>Export DOCX</button>
            {data?.summary_path && <a href={data.summary_path} style={{border:'1px solid #333',padding:'8px'}}>Download JSON</a>}
            {data?.transcript_path && <a href={data.transcript_path} style={{border:'1px solid #333',padding:'8px'}}>Download TXT</a>}
          </div>
          <div style={{display:'flex',gap:'24px',marginTop:'12px'}}>
            <div style={{flex:1}}>
              <h3 className="merriweather-500" style={{fontSize:'16px'}}>Decisions</h3>
              <ul className="merriweather-500" style={{paddingLeft:'24px'}}>
                {(summary.decisions||[]).map((d:string,i:number)=>(<li key={i}>{d}</li>))}
              </ul>
            </div>
            <div style={{flex:1}}>
              <h3 className="merriweather-500" style={{fontSize:'16px'}}>Action Items</h3>
              <ul className="merriweather-500" style={{paddingLeft:'24px'}}>
                {(summary.action_items||[]).map((a:string,i:number)=>(<li key={i}>{a}</li>))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section style={{marginTop:'16px'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <h2 className="bbh-sans-bartle-regular" style={{fontSize:'20px'}}>Transcript</h2>
          <input placeholder="Search..." value={filter} onChange={e=>setFilter(e.target.value)} />
        </div>
        {speakers.length>0 && (
          <div className="merriweather-500" style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'8px'}}>
            {speakers.map(spk=> (
              <label key={spk}>Rename {spk}: <input value={rename[spk]||''} onChange={e=>setRename({...rename,[spk]:e.target.value})} /></label>
            ))}
          </div>
        )}
        <div className="merriweather-500" style={{border:'1px solid #333',padding:'8px',marginTop:'8px'}}>
          {filtered.length>0 ? filtered.map((s:any,i:number)=>(
            <div key={i}><strong>{rename[s[0]]||s[0]||''}</strong> {s[1]||''}</div>
          )) : 'Loading...'}
        </div>
      </section>
    </main>
  );
}
