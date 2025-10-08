# Meeting Summarizer (local, free stack)

- Backend: FastAPI + faster-whisper (offline ASR) + Ollama (local LLM)
- Frontend: Next.js (App Router). No hover effects, no border radius. Fonts injected per spec.
- Storage: local filesystem (no DB in first cut; jobs are synchronous).

Setup (Windows / PowerShell)
1. Ensure Node, Python 3.11, Git, FFmpeg, Ollama are installed. We already installed most during bootstrap.
2. Create venv and install deps:
   - python 3.11 venv at `.venv` is already created
   - To install deps from file: `.venv\Scripts\pip install -r backend/requirements.txt`
3. Copy `.env.example` to `.env` (root) and edit FFMPEG_BIN/OLLAMA_MODEL if needed.
4. Start backend:
   - `./backend/run_dev.ps1`
5. Start frontend (after we scaffold it):
   - `cd frontend && npm run dev`

API quick test (once backend is running)
- POST http://localhost:8000/api/process with form-data `file=@path/to/audio.mp3`

Notes
- Ollama must be running and the model specified by `OLLAMA_MODEL` must be pulled.
- For zero-cost operation, everything runs locally. To allow other users to access, expose your backend on LAN.