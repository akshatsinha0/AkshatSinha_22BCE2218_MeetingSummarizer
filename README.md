# Meeting Summarizer (local, free stack)

## Tech Stack

### Backend: FastAPI + faster-whisper (offline ASR) + Ollama (local LLM) + Rust extensions (PyO3)

### Frontend: Next.js (App Router)

### Storage: local filesystem + SQLite for jobs, with a simple background worker

## Demo Video
Watch the demo: [Meeting Summarizer Demo](https://drive.google.com/file/d/1SmWLG85v2LzqkVThGXOmt4uf1i5xPsnI/view?usp=sharing)

Setup (Windows / PowerShell)
1. Ensure Node, Python 3.11, Git, FFmpeg, Ollama, Rust are installed. I already installed most during bootstrap.
2. Create venv and install deps:
   - python 3.11 venv at `.venv` is already created
   - To install deps from file: `.venv\Scripts\pip install -r backend/requirements.txt`
   - Build Rust extensions: `.venv\Scripts\maturin develop --manifest-path backend/rust_audio/Cargo.toml -
3. Copy `.env.example` to `.env` (root) and edit FFMPEG_BIN/OLLAMA_MODEL if needed.
4. Get HF token from https://huggingface.co/settings/tokens and add to `.env` as `HF_TOKEN` (required for speaker diarization).
5. Start both backend and frontend:
   - `.\dev.ps1` (from root project directory)
   - Or start separately:
     - Backend: `./backend/run_dev.ps1`
     - Frontend: `cd frontend && npm run dev`

API quick test (once backend is running locally, that's why localhost)

1. Test health endpoint:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
```
Expected output:
```
status      : ok
diarization : enabled
model       : gemma3:4b
```

2. List available Ollama models:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/models" -Method Get
```
Expected output: JSON with list of installed Ollama models

3. List all jobs:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs" -Method Get
```
Expected output: Array of job objects (empty if no jobs created yet)

4. Create async job (recommended for all files):
```powershell
$audioFile = "path\to\your\audio.mp3"
$form = @{ file = Get-Item -Path $audioFile }
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs" -Method Post -Form $form
```
Expected output: Job object with `job_id`, `status: "queued"`, and other metadata

5. Check job status (replace JOB_ID with actual ID from step 4):
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs/JOB_ID" -Method Get
```
Expected output: Job object with current `status` (queued → processing → done), `progress`, `stage`, and paths to results

6. Synchronous processing (only for small files, <2 min):
```powershell
$audioFile = "path\to\your\audio.mp3"
$form = @{ file = Get-Item -Path $audioFile }
Invoke-RestMethod -Uri "http://localhost:8000/api/process" -Method Post -Form $form
```
Expected output: JSON with `transcript`, `summary`, `decisions`, and `action_items`

Notes
- Ollama must be running and the model specified by `OLLAMA_MODEL` must be pulled (currently gemma3:4b).
- For zero-cost operation, everything runs locally. To allow other users to access, expose your backend on LAN.
- Diarization uses pyannote when HF_TOKEN is set; otherwise you’ll get transcript without speaker tags.
- Optional cloud ASR: set TRANSCRIBE_PROVIDER=azure|deepgram and DAILY_ASR_BUDGET_MIN to a small value to enable limited cloud minutes.
