# *Meeting Summarizer (local, free stack)*

## Tech Stack

### Backend: FastAPI + faster-whisper (offline ASR) + Ollama (local LLM) + Rust extensions (PyO3)

### Frontend: Next.js (App Router)

### Storage: local filesystem + SQLite for jobs, with a simple background worker

## Demo Video
Watch the demo: [Meeting Summarizer Demo](https://drive.google.com/file/d/1SmWLG85v2LzqkVThGXOmt4uf1i5xPsnI/view?usp=sharing)

## Project Deliverables - Meeting Summarizer

**Objective:** Transcribe meeting audio and generate action-oriented summaries

## Features

### Core Features (Original)

(1) **Audio Input Support** - Accepts meeting audio files in multiple formats (MP3, WAV, etc.)

(2) **Text Transcript Generation** - Using OpenAI Whisper (faster-whisper implementation, large-v3-turbo model)

(3) **ASR API Integration** - Integrated with:
  - Primary: OpenAI Whisper (local, offline, zero-cost)
  - Optional: Azure Speech, Deepgram (cloud fallback with budget controls)

(4) **Speaker Diarization** - Identifies and labels different speakers using pyannote

(5) **Summary Generation** - LLM-powered summaries highlighting key points

(6) **Key Decisions Extraction** - Automatically identifies and lists decisions made

(7) **Action Items Generation** - Extracts actionable tasks from meetings

(8) **Backend Data Processing** - FastAPI backend with SQLite storage for job management

(9) **Frontend UI** - Next.js web interface to upload audio and view results

(10) **Async Job Processing** - Background worker for handling long audio files

(11) **Progress Tracking** - Real-time status updates during processing

(12) **Export Options** - PDF and DOCX export for summaries

### New Features (Enhanced)

(13) **Real-time Meeting Transcription** - Live audio streaming with WebSocket support
  - Process audio chunks as they arrive during ongoing meetings
  - Display live transcription with timestamps
  - MediaRecorder integration for browser-based recording
  - Useful for remote meetings, interviews, and live note-taking

(14) **Transcript Editing** - Manual correction and version control
  - Inline editing of transcripts with textarea
  - Automatic summary regeneration after edits
  - Version history tracking for all edits
  - Preserve original transcripts while allowing corrections

(15) **Voice Commands & Bookmarks** - Mark important moments during playback
  - Add bookmarks at specific timestamps
  - Label important sections for quick reference
  - Jump to bookmarked moments instantly
  - Voice-activated marking during recording

(16) **Keyboard Shortcuts** - Quick navigation and controls
  - Ctrl+K: Toggle shortcuts panel
  - Ctrl+T: Toggle dark/light theme
  - Ctrl+L: Go to live transcription
  - Esc: Close panels
  - Speed controls for audio playback (0.5x to 2.0x)

(17) **Dark/Light Theme Toggle** - Accessibility improvements
  - Full theme support with localStorage persistence
  - High contrast modes for better readability
  - Consistent color scheme across all pages
  - Automatic theme detection

(18) **Batch Processing** - Upload and process multiple files at once
  - Multi-file upload support
  - Parallel processing queue
  - Bulk export functionality (PDF/DOCX)
  - Progress tracking for all files

(19) **Calendar Integration** - Auto-fetch meeting metadata
  - Google Calendar API integration
  - Fetch attendees, title, and scheduled time
  - Link action items to calendar events
  - Search meetings by title or date
  - Create follow-up meetings automatically

(20) **Compliance Checking** - Flag potential legal/compliance issues
  - Automatic PII detection (emails, phone numbers, SSN)
  - Legal keyword flagging (confidential, NDA, trade secret)
  - Financial information detection
  - Severity levels (critical, high, medium)
  - Visual warnings for sensitive content

(21) **Custom Analysis Prompts** - Reanalyze transcripts with different prompts
  - Pre-built prompt suggestions
  - Extract specific information types
  - Multiple analysis views of same transcript
  - Save and reuse custom prompts

### Completed Features (Legacy Format)

![Audio Input](https://img.shields.io/badge/Audio_Input-Complete-success?style=flat-square)
![Transcription](https://img.shields.io/badge/Transcription-Complete-success?style=flat-square)
![ASR Integration](https://img.shields.io/badge/ASR_Integration-Complete-success?style=flat-square)
![Speaker Diarization](https://img.shields.io/badge/Speaker_Diarization-Complete-success?style=flat-square)
![Summary Generation](https://img.shields.io/badge/Summary_Generation-Complete-success?style=flat-square)
![Key Decisions](https://img.shields.io/badge/Key_Decisions-Complete-success?style=flat-square)
![Action Items](https://img.shields.io/badge/Action_Items-Complete-success?style=flat-square)
![Backend Processing](https://img.shields.io/badge/Backend_Processing-Complete-success?style=flat-square)
![Frontend UI](https://img.shields.io/badge/Frontend_UI-Complete-success?style=flat-square)
![Async Jobs](https://img.shields.io/badge/Async_Jobs-Complete-success?style=flat-square)
![Progress Tracking](https://img.shields.io/badge/Progress_Tracking-Complete-success?style=flat-square)
![Export Options](https://img.shields.io/badge/Export_Options-Complete-success?style=flat-square)



### Technical Implementation

**ASR (Automatic Speech Recognition):**
- Primary: OpenAI Whisper via faster-whisper (local, offline)
- Model: large-v3-turbo (configurable via WHISPER_MODEL env variable)
- Optional cloud providers: Azure Speech, Deepgram with daily budget limits

**LLM for Summarization:**
- Ollama integration (local LLM, zero-cost)
- Default model: gemma3:4b (configurable)
- Prompt: "Summarize this meeting transcript into key decisions and action items"
- Output: Structured JSON with summary, decisions array, and action_items array

**Performance Optimizations:**
- Rust extensions (PyO3) for audio validation and processing
- Background job queue with ThreadPoolExecutor
- SQLite for lightweight job persistence

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


## Keyboard Shortcuts

- **Ctrl+K** - Toggle keyboard shortcuts panel
- **Ctrl+T** - Toggle dark/light theme
- **Ctrl+L** - Navigate to live transcription page
- **Esc** - Close open panels and modals

## Calendar Integration Setup (Optional)

To enable Google Calendar integration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Desktop app)
5. Download credentials as `credentials.json` and place in project root
6. First API call will open browser for authentication
7. Token will be saved as `token.pickle` for future use

## Additional Notes

- Real-time transcription requires microphone access in browser
- Calendar integration is optional and requires Google OAuth setup
- Compliance checking runs automatically on completed jobs
- Batch processing supports unlimited files (limited by system resources)
- All features work offline except calendar integration and optional cloud ASR
