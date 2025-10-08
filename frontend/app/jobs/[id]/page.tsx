'use client';

import { useEffect, useState } from 'react';

export default function JobView({ params }: { params: { id: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [data,setData]=useState<any>(null);
  const [err,setErr]=useState<string>('');

  useEffect(()=>{
    const t=setInterval(async()=>{
      try{
        const r=await fetch(`${apiBase}/api/jobs/${params.id}`);
        if(!r.ok){ setErr(await r.text()); return; }
        const j=await r.json(); setData(j);
        if(j.status==='done' || j.status==='error') clearInterval(t);
      }catch(e:any){ setErr(String(e)); }
    },1000);
    return ()=> clearInterval(t);
  },[params.id]);

  return (
    <main style={{minHeight:'100vh',padding:'24px'}}>
      <h1 className="bbh-sans-bartle-regular" style={{fontSize:'24px'}}>Job {params.id}</h1>
      {err && <pre style={{color:'tomato'}}>{err}</pre>}
      <pre className="merriweather-500" style={{marginTop:'16px',padding:'12px',border:'1px solid #333'}}>{data?JSON.stringify(data,null,2):'Loading...'}</pre>
      {data?.summary_path && <a style={{display:'inline-block',marginTop:'8px'}} href={data.summary_path}>Download summary JSON</a>}
      {data?.transcript_path && <a style={{display:'inline-block',marginLeft:'12px'}} href={data.transcript_path}>Download transcript</a>}
    </main>
  );
}