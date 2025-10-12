# Meeting Summarizer (local, free stack)

- Backend: FastAPI + faster-whisper (offline ASR) + Ollama (local LLM)
- Frontend: Next.js (App Router).
- Storage: local filesystem + SQLite for jobs, with a simple background worker.

Setup (Windows / PowerShell)
1. Ensure Node, Python 3.11, Git, FFmpeg, Ollama are installed. I already installed most during bootstrap.
2. Create venv and install deps:
   - python 3.11 venv at `.venv` is already created
   - To install deps from file: `.venv\Scripts\pip install -r backend/requirements.txt`
3. Copy `.env.example` to `.env` (root) and edit FFMPEG_BIN/OLLAMA_MODEL if needed.
4. Get HF token from https://huggingface.co/settings/tokens and add to `.env` as `HF_TOKEN` (required for speaker diarization).
5. Start both backend and frontend:
   - `.\dev.ps1` (from root project directory)
   - Or start separately:
     - Backend: `./backend/run_dev.ps1`
     - Frontend: `cd frontend && npm run dev`

API quick test (once backend is running)
- Synchronous (small files): POST http://localhost:8000/api/process with form-data `file=@path/to/audio.mp3`
- Async job (recommended): POST http://localhost:8000/api/jobs with form-data `file=@path/to/audio.mp3` → returns job_id
- Poll: GET http://localhost:8000/api/jobs/{job_id}

Notes
- Ollama must be running and the model specified by `OLLAMA_MODEL` must be pulled (currently gemma3:4b).
- For zero-cost operation, everything runs locally. To allow other users to access, expose your backend on LAN.
- Diarization uses pyannote when HF_TOKEN is set; otherwise you’ll get transcript without speaker tags.
- Optional cloud ASR: set TRANSCRIBE_PROVIDER=azure|deepgram and DAILY_ASR_BUDGET_MIN to a small value to enable limited cloud minutes.
