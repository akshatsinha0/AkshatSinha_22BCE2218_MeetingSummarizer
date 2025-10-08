'use client';

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList } };
    const file = form.file.files?.[0];
    if (!file) { alert('Choose an audio file'); return; }
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(`${apiBase}/api/jobs`, { method: 'POST', body: fd });
    if (!res.ok) { alert('Error: ' + (await res.text())); return; }
    const data = await res.json();
    const out = document.getElementById('output');
    if (out) out.textContent = JSON.stringify(data, null, 2);
    // Provide link to job page
    const link = document.getElementById('joblink') as HTMLAnchorElement | null;
    if (link && data?.job_id) { link.href = `/jobs/${data.job_id}`; link.textContent = `View job ${data.job_id}`; }
  }

  return (
    <main style={{minHeight:'100vh',padding:'24px'}}>
      <h1 className="bbh-sans-bartle-regular" style={{fontSize:'28px'}}>Meeting Summarizer</h1>
      <form onSubmit={handleSubmit} className="merriweather-500" style={{marginTop:'16px'}}>
        <div className="box" style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <label>Audio file</label>
          <input name="file" type="file" accept="audio/*" />
          <button type="submit" style={{padding:'8px 12px',border:'1px solid #444',background:'#111',color:'#fff'}}>Upload & Process</button>
        </div>
      </form>
      <a id="joblink" className="merriweather-500" style={{display:'inline-block',marginTop:'12px'}} href="#"></a>
      <pre id="output" className="merriweather-500" style={{marginTop:'16px',padding:'12px',border:'1px solid #333',whiteSpace:'pre-wrap'}}></pre>
    </main>
  );
}
