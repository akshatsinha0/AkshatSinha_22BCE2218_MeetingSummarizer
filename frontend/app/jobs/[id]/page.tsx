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
  const [revealedLines,setRevealedLines]=useState<Set<number>>(new Set());
  const [typewriterText,setTypewriterText]=useState<Record<number,string>>({});
  const [animatingLines,setAnimatingLines]=useState<Set<number>>(new Set());

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

  async function exportPdf(){ await fetch(`${apiBase}/api/jobs/${id}/export/pdf`).then(r=>r.json()).then(j=>window.open(`${apiBase}${j.pdf}`,'_blank')); }
  async function exportDocx(){ await fetch(`${apiBase}/api/jobs/${id}/export/docx`).then(r=>r.json()).then(j=>window.open(`${apiBase}${j.docx}`,'_blank')); }

  const speakers=Array.from(new Set(segments.map(s=>s[0]).filter(Boolean)));
  const filtered = segments.filter(s=>!filter || (s[1]||'').toLowerCase().includes(filter.toLowerCase()));

  function revealLine(index:number,text:string){
    if(revealedLines.has(index))return;
    setRevealedLines(prev=>new Set(prev).add(index));
    setAnimatingLines(prev=>new Set(prev).add(index));
    setTypewriterText(prev=>({...prev,[index]:''}));
    let charIndex=0;
    const interval=setInterval(()=>{
      if(charIndex<text.length){
        setTypewriterText(prev=>({...prev,[index]:text.substring(0,charIndex+1)}));
        charIndex++;
      }else{
        clearInterval(interval);
        setAnimatingLines(prev=>{
          const newSet=new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }
    },20);
  }

  function revealAll(){
    const newRevealed=new Set<number>();
    const newText:Record<number,string>={};
    filtered.forEach((s,i)=>{
      newRevealed.add(i);
      newText[i]=s[1]||'';
    });
    setRevealedLines(newRevealed);
    setTypewriterText(newText);
  }

  return (
    <>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'#000',zIndex:100,padding:'24px',paddingBottom:'12px',borderBottom:'1px solid #333',boxShadow:'0 2px 8px rgba(0,0,0,0.5)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <h1 className="bbh-sans-bartle-regular" style={{fontSize:'24px'}}>Job {id}</h1>
        {data?.status === 'done' && data?.progress === 1.0 && (
          <svg width="100%" height="4" style={{marginTop:'8px',marginBottom:'8px'}}>
            <defs>
              <linearGradient id="colorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ff88" />
                <stop offset="50%" stopColor="#00ccff" />
                <stop offset="100%" stopColor="#00ff88" />
              </linearGradient>
              <linearGradient id="opacityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopOpacity="0" />
                <stop offset="50%" stopOpacity="1" />
                <stop offset="100%" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="100%" height="4" fill="url(#colorGrad)" opacity="url(#opacityGrad)" style={{mask:'linear-gradient(90deg, transparent, black 20%, black 80%, transparent)'}} />
          </svg>
        )}
        {err && <pre style={{color:'tomato'}}>{err}</pre>}
        <div className="merriweather-500" style={{marginTop:'8px'}}>Status: {data?.status} {data?.stage?`(${data.stage})`:''} {data?.progress?` ${(data.progress*100).toFixed(0)}%`:''}</div>
        </div>
        <a href="/" style={{padding:'8px 16px',border:'1px solid #444',background:'#111',color:'#fff',textDecoration:'none',display:'inline-block',marginLeft:'16px'}}>
          + Add Another Audio
        </a>
      </div>
      <main style={{minHeight:'100vh',paddingTop:'140px'}}>
      <div style={{padding:'24px'}}>

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
            {data?.summary_path && <a href={`${apiBase}${data.summary_path}`} target="_blank" rel="noopener noreferrer" style={{border:'1px solid #333',padding:'8px',textDecoration:'none',color:'inherit'}}>Download JSON</a>}
            {data?.transcript_path && <a href={`${apiBase}${data.transcript_path}`} target="_blank" rel="noopener noreferrer" style={{border:'1px solid #333',padding:'8px',textDecoration:'none',color:'inherit'}}>Download TXT</a>}
          </div>
          <div style={{display:'flex',gap:'24px',marginTop:'12px'}}>
            <div style={{flex:1}}>
              <h3 className="merriweather-500" style={{fontSize:'16px'}}>Decisions</h3>
              {(summary.decisions||[]).length > 0 ? (
                <ul className="merriweather-500" style={{paddingLeft:'24px'}}>
                  {summary.decisions.map((d:string,i:number)=>(<li key={i}>{d}</li>))}
                </ul>
              ) : (
                <p className="merriweather-500" style={{color:'#666',fontStyle:'italic'}}>No decisions identified</p>
              )}
            </div>
            <div style={{flex:1}}>
              <h3 className="merriweather-500" style={{fontSize:'16px'}}>Action Items</h3>
              {(summary.action_items||[]).length > 0 ? (
                <ul className="merriweather-500" style={{paddingLeft:'24px'}}>
                  {summary.action_items.map((a:string,i:number)=>(<li key={i}>{a}</li>))}
                </ul>
              ) : (
                <p className="merriweather-500" style={{color:'#666',fontStyle:'italic'}}>No action items identified</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section style={{marginTop:'16px'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <h2 className="bbh-sans-bartle-regular" style={{fontSize:'20px'}}>Transcript</h2>
            <input placeholder="Search..." value={filter} onChange={e=>setFilter(e.target.value)} />
          </div>
          <button 
            onClick={revealAll}
            style={{padding:'6px 12px',border:'1px solid #444',background:'#111',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
            title="Reveal all lines"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 8h14M8 1v14"/>
            </svg>
            Show All
          </button>
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
            <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <button
                onClick={()=>revealLine(i,s[1]||'')}
                style={{background:'none',border:'none',cursor:'pointer',padding:'4px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}
                title="Reveal line"
              >
                {revealedLines.has(i) ? (
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#fff'}}></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="4,2 12,8 4,14"/>
                  </svg>
                )}
              </button>
              <strong style={{minWidth:'120px',textAlign:'left',flexShrink:0}}>{rename[s[0]]||s[0]||''}</strong>
              <div style={{flex:1,borderBottom:'1px dotted #555',height:'1px'}}></div>
              <span style={{textAlign:'right',flexShrink:0,minHeight:'20px',overflow:'hidden',whiteSpace:'nowrap'}}>
                {revealedLines.has(i) ? (typewriterText[i]||'') : ''}
              </span>
            </div>
          )) : 'Loading...'}
        </div>
      </section>
      </div>
    </main>
    </>
  );
}
