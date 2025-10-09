import os
import tempfile
import subprocess
import uuid
import json
import threading
import sqlite3
import datetime as dt
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

# Load .env from project root if present
try:
    here=os.path.abspath(os.path.dirname(__file__))
    root=os.path.abspath(os.path.join(here, os.pardir, os.pardir))
    load_dotenv(os.path.join(root, ".env"))
except Exception:
    pass

# ---- Config ----
OLLAMA_BASE_URL=os.getenv("OLLAMA_BASE_URL","http://127.0.0.1:11434")
OLLAMA_MODEL=os.getenv("OLLAMA_MODEL","qwen3:4b")
WHISPER_MODEL=os.getenv("WHISPER_MODEL","large-v3-turbo")
FFMPEG_BIN=os.getenv("FFMPEG_BIN","ffmpeg")
HF_TOKEN=os.getenv("HF_TOKEN","")
TRANSCRIBE_PROVIDER=os.getenv("TRANSCRIBE_PROVIDER","local") # local|azure|deepgram|google
DAILY_ASR_BUDGET_MIN=int(os.getenv("DAILY_ASR_BUDGET_MIN","0"))
CLOUD_FALLBACK=os.getenv("CLOUD_FALLBACK","never") # never|on_error|on_low_confidence
CONF_THRESHOLD=float(os.getenv("CONF_THRESHOLD","0.4"))
STORAGE_DIR=os.getenv("STORAGE_DIR",os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir)),"storage"))
DB_PATH=os.path.join(STORAGE_DIR,"app.db")

os.makedirs(STORAGE_DIR,exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR,"audio"),exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR,"transcripts"),exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR,"summaries"),exist_ok=True)

app=FastAPI(title="Meeting Summarizer API")
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

class SummaryOut(BaseModel):
    transcript:str
    summary:str
    decisions:List[str]
    action_items:List[str]

class JobOut(BaseModel):
    job_id:str
    status:str
    created_at:str
    updated_at:str
    transcript_path:Optional[str]=None
    summary_path:Optional[str]=None
    error:Optional[str]=None

# ---- DB & Queue ----
_conn=sqlite3.connect(DB_PATH,check_same_thread=False)
_conn.execute("""
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  input_path TEXT,
  transcript_path TEXT,
  summary_path TEXT,
  error TEXT
)
""")
_conn.execute("""
CREATE TABLE IF NOT EXISTS usage_budget (
  day TEXT PRIMARY KEY,
  minutes_used REAL NOT NULL
)
""")
_conn.commit()
_db_lock=threading.Lock()

_executor=ThreadPoolExecutor(max_workers=2)

# ---- Utilities ----

def _ensure_wav(input_path:str)->str:
    ext=os.path.splitext(input_path)[1].lower()
    if ext==".wav":
        return input_path
    wav_path=input_path+".wav"
    try:
        subprocess.run([FFMPEG_BIN,"-y","-i",input_path,"-ac","1","-ar","16000",wav_path],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    except FileNotFoundError:
        raise HTTPException(status_code=500,detail="ffmpeg not found. Set FFMPEG_BIN or ensure it is on PATH.")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500,detail=f"ffmpeg failed: {e}")
    return wav_path

# Helpers for budget tracking

def _get_audio_duration(path:str)->float:
    try:
        r=subprocess.run([FFMPEG_BIN.replace('ffmpeg','ffprobe'),"-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",path],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,text=True)
        return float(r.stdout.strip())
    except Exception:
        return 0.0

def _budget_allow(duration_sec:float)->bool:
    if DAILY_ASR_BUDGET_MIN<=0:
        return False
    today=dt.date.today().isoformat()
    with _db_lock:
        cur=_conn.execute("SELECT minutes_used FROM usage_budget WHERE day=?",(today,))
        row=cur.fetchone()
        used=row[0] if row else 0.0
        allow=(used+duration_sec/60.0)<=DAILY_ASR_BUDGET_MIN
        return allow

def _budget_add(duration_sec:float)->None:
    today=dt.date.today().isoformat()
    with _db_lock:
        cur=_conn.execute("SELECT minutes_used FROM usage_budget WHERE day=?",(today,))
        row=cur.fetchone()
        used=row[0] if row else 0.0
        used+=duration_sec/60.0
        _conn.execute("REPLACE INTO usage_budget(day,minutes_used) VALUES(?,?)",(today,used))
        _conn.commit()

# ASR using faster-whisper (local)
def _transcribe(path:str):
    from faster_whisper import WhisperModel
    model=WhisperModel(WHISPER_MODEL,device="cpu")
    segments,info=model.transcribe(path,beam_size=1,language=None)
    out_segments=[]
    parts=[]
    for seg in segments:
        out_segments.append({"start":float(seg.start or 0),"end":float(seg.end or 0),"text":seg.text})
        parts.append(seg.text)
    return " ".join(parts).strip(),out_segments

# Cloud ASR (optional)

def _transcribe_cloud(path:str):
    provider=TRANSCRIBE_PROVIDER.lower()
    duration=_get_audio_duration(path)
    if provider=="local":
        return None
    if not _budget_allow(duration):
        return None
    try:
        import requests
        audio=open(path,'rb').read()
        if provider=="azure":
            key=os.getenv("AZURE_SPEECH_KEY"); region=os.getenv("AZURE_SPEECH_REGION")
            if not key or not region:
                return None
            url=f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US"
            headers={"Ocp-Apim-Subscription-Key":key,"Content-Type":"audio/wav"}
            r=requests.post(url,data=audio,headers=headers,timeout=600)
            r.raise_for_status()
            _budget_add(duration)
            data=r.json(); text=data.get("DisplayText") or data.get("Text") or ""
            return text
        elif provider=="deepgram":
            dg=os.getenv("DEEPGRAM_API_KEY");
            if not dg:
                return None
            url="https://api.deepgram.com/v1/listen?model=nova-2-meeting&diarize=true&smart_format=true"
            headers={"Authorization":f"Token {dg}","Content-Type":"audio/wav"}
            r=requests.post(url,data=audio,headers=headers,timeout=600)
            r.raise_for_status()
            _budget_add(duration)
            data=r.json();
            text=" ".join(alt.get('transcript','') for alt in data.get('results',{}).get('channels',[{}])[0].get('alternatives',[]))
            return text
    except Exception:
        return None
    return None

# Summarization via Ollama HTTP API

def _summarize(transcript:str)->SummaryOut:
    import json,requests
    prompt=(
        "You are a meeting summarizer. Given the transcript, return a terse summary, a bullet list of key decisions, and actionable next steps.\n"
        "Return strict JSON with keys: summary, decisions (array), action_items (array).\n"
        f"Transcript:\n{transcript}\n"
    )
    payload={"model":OLLAMA_MODEL,"prompt":prompt,"stream":False}
    try:
        r=requests.post(f"{OLLAMA_BASE_URL}/api/generate",json=payload,timeout=600)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"Ollama request failed: {e}")
    data=r.json()
    # data["response"] should contain JSON or text; try to parse JSON block
    txt=data.get("response","{}")
    # try parse
    parsed=None
    try:
        parsed=json.loads(txt)
    except Exception:
        # naive extraction of JSON braces
        import re
        m=re.search(r"\{[\s\S]*\}",txt)
        if m:
            try:
                parsed=json.loads(m.group(0))
            except Exception:
                parsed=None
    if not isinstance(parsed,dict):
        parsed={"summary":txt[:800],"decisions":[],"action_items":[]}
    return SummaryOut(transcript=transcript,summary=str(parsed.get("summary","")),decisions=list(parsed.get("decisions",[])),action_items=list(parsed.get("action_items",[])))

# Diarization via pyannote

def _diarize(path:str):
    if not HF_TOKEN:
        print("⚠️  HF_TOKEN not set - skipping diarization")
        return []
    try:
        from pyannote.audio import Pipeline
        print(f"<---->Loading diarization pipeline...")
        pipeline=Pipeline.from_pretrained("pyannote/speaker-diarization-3.1",token=HF_TOKEN)
        print(f"<---->Running diarization on {path}...")
        annotation=pipeline(path)
        print(f"<---->Diarization complete")
    except Exception as e:
        # Fail soft if token missing or model access not granted
        print(f"<---->Diarization failed: {type(e).__name__}: {e}")
        return []
    diar_segments=[]
    speakers_map={}
    next_id=1
    for turn,_,speaker in annotation.itertracks(yield_label=True):
        if speaker not in speakers_map:
            speakers_map[speaker]=f"SPEAKER_{next_id}"
            next_id+=1
        diar_segments.append({"start":float(turn.start),"end":float(turn.end),"speaker":speakers_map[speaker]})
    diar_segments.sort(key=lambda x:x["start"])
    return diar_segments

def _assign_speakers(asr_segments,diar_segments):
    if not diar_segments:
        return [(None,s.get("text","")) for s in asr_segments]
    def find_speaker(ts):
        mid=(ts["start"]+ts["end"])/2.0
        for d in diar_segments:
            if d["start"]<=mid<=d["end"]:
                return d["speaker"]
        # fallback to max overlap
        best=None;over=0
        for d in diar_segments:
            a=max(d["start"],ts["start"]);b=min(d["end"],ts["end"])
            ov=max(0.0,b-a)
            if ov>over:
                over=ov;best=d["speaker"]
        return best
    labeled=[]
    for s in asr_segments:
        spk=find_speaker(s)
        labeled.append((spk,s["text"]))
    return labeled

@app.get("/health")
def health():
    return {"status":"ok","diarization":"enabled" if HF_TOKEN else "disabled","model":OLLAMA_MODEL}

@app.post("/api/process",response_model=SummaryOut)
async def process_meeting(file:UploadFile=File(...)):
    suffix=os.path.splitext(file.filename or "audio")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False,suffix=suffix) as tmp:
        raw_path=tmp.name
        content=await file.read()
        tmp.write(content)
    wav_path=_ensure_wav(raw_path)
    # try cloud only if allowed (partial cloud)
    cloud_text=_transcribe_cloud(wav_path)
    if cloud_text:
        transcript=cloud_text
        segments=[{"start":0.0,"end":0.0,"text":cloud_text}]
    else:
        transcript,segments=_transcribe(wav_path)
    diar=_diarize(wav_path)
    labeled=_assign_speakers(segments,diar)
    labeled_text=[]
    for spk,txt in labeled:
        if spk: labeled_text.append(f"{spk}: {txt}")
        else: labeled_text.append(txt)
    final_transcript="\n".join(labeled_text) if labeled_text else transcript
    return _summarize(final_transcript)

# ---- Async Jobs API ----

def _db_upsert_job(job_id:str, **kwargs):
    now=dt.datetime.utcnow().isoformat()
    with _db_lock:
        cur=_conn.execute("SELECT id FROM jobs WHERE id=?",(job_id,))
        exists=cur.fetchone() is not None
        if exists:
            sets=", ".join([f"{k}=?" for k in kwargs.keys()])
            vals=list(kwargs.values())
            vals.append(job_id)
            _conn.execute(f"UPDATE jobs SET {sets}, updated_at=? WHERE id=?",(*kwargs.values(),now,job_id))
        else:
            _conn.execute("INSERT INTO jobs(id,status,created_at,updated_at) VALUES(?,?,?,?)",(job_id,kwargs.get('status','queued'),now,now))
        _conn.commit()

def _job_row_to_out(row)->JobOut:
    return JobOut(job_id=row[0],status=row[1],created_at=row[2],updated_at=row[3],transcript_path=row[5],summary_path=row[6],error=row[7])

def _process_job(job_id:str, file_path:str):
    try:
        _db_upsert_job(job_id,status='processing',input_path=file_path)
        wav_path=_ensure_wav(file_path)
        cloud_text=_transcribe_cloud(wav_path)
        if cloud_text:
            transcript=cloud_text
            segments=[{"start":0.0,"end":0.0,"text":cloud_text}]
        else:
            transcript,segments=_transcribe(wav_path)
        diar=_diarize(wav_path)
        labeled=_assign_speakers(segments,diar)
        labeled_text=[(f"{spk}: {txt}" if spk else txt) for spk,txt in labeled]
        final_transcript="\n".join(labeled_text) if labeled_text else transcript
        summary=_summarize(final_transcript)
        # persist
        tfile=os.path.join(STORAGE_DIR,"transcripts",f"{job_id}.txt")
        sfile=os.path.join(STORAGE_DIR,"summaries",f"{job_id}.json")
        open(tfile,'w',encoding='utf-8').write(final_transcript)
        open(sfile,'w',encoding='utf-8').write(summary.model_dump_json(indent=2))
        turl=f"/storage/transcripts/{job_id}.txt"
        surl=f"/storage/summaries/{job_id}.json"
        _db_upsert_job(job_id,status='done',transcript_path=turl,summary_path=surl)
    except Exception as e:
        _db_upsert_job(job_id,status='error',error=str(e))

@app.post("/api/jobs",response_model=JobOut)
async def create_job(file:UploadFile=File(...)):
    job_id=str(uuid.uuid4())
    suffix=os.path.splitext(file.filename or "audio")[1] or ".wav"
    audio_path=os.path.join(STORAGE_DIR,"audio",f"{job_id}{suffix}")
    with open(audio_path,'wb') as f:
        f.write(await file.read())
    _db_upsert_job(job_id,status='queued',input_path=audio_path)
    _executor.submit(_process_job,job_id,audio_path)
    with _db_lock:
        row=_conn.execute("SELECT * FROM jobs WHERE id=?",(job_id,)).fetchone()
    return _job_row_to_out(row)

@app.get("/api/jobs/{job_id}",response_model=JobOut)
async def get_job(job_id:str):
    with _db_lock:
        row=_conn.execute("SELECT * FROM jobs WHERE id=?",(job_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404,detail="job not found")
    return _job_row_to_out(row)

@app.get("/api/jobs",response_model=List[JobOut])
async def list_jobs(limit:int=20):
    with _db_lock:
        rows=_conn.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?",(limit,)).fetchall()
    return [_job_row_to_out(r) for r in rows]
