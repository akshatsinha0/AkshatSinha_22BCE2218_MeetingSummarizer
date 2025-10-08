import os
import tempfile
import subprocess
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

app=FastAPI(title="Meeting Summarizer API")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

class SummaryOut(BaseModel):
    transcript:str
    summary:str
    decisions:List[str]
    action_items:List[str]

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

# ASR using faster-whisper

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
        return []
    try:
        from pyannote.audio import Pipeline
        pipeline=Pipeline.from_pretrained("pyannote/speaker-diarization-3.1",use_auth_token=HF_TOKEN)
        annotation=pipeline(path)
    except Exception as e:
        # Fail soft if token missing or model access not granted
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
    return {"status":"ok"}

@app.post("/api/process",response_model=SummaryOut)
async def process_meeting(file:UploadFile=File(...)):
    suffix=os.path.splitext(file.filename or "audio")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False,suffix=suffix) as tmp:
        raw_path=tmp.name
        content=await file.read()
        tmp.write(content)
    wav_path=_ensure_wav(raw_path)
    transcript,segments=_transcribe(wav_path)
    diar=_diarize(wav_path)
    labeled=_assign_speakers(segments,diar)
    labeled_text=[]
    for spk,txt in labeled:
        if spk: labeled_text.append(f"{spk}: {txt}")
        else: labeled_text.append(txt)
    final_transcript="\n".join(labeled_text) if labeled_text else transcript
    return _summarize(final_transcript)
