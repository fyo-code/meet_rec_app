# Meeting Transcription App — Implementation Plan

## Project Overview

A web application for transcribing real-life, physical meetings. Users place their phone on the table, open the app, press record, and get a transcribed, diarized, summarized meeting sent to participants via email.

**Primary language:** Romanian (with natural English business terms mixed in)
**Target device:** Mobile phone browser (phone placed in center of table)
**Core workflow:** Record > Transcribe > Diarize > Summarize > Email

---

## Technical Architecture

```
Browser (Mobile)
    |
    v
┌─────────────────────────────────────────┐
│           Next.js App                    │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Recording UI │  │  Results UI     │  │
│  │  (React)      │  │  (React)        │  │
│  └──────┬────────┘  └───────▲─────────┘  │
│         │                   │            │
│  ┌──────▼───────────────────┴─────────┐  │
│  │        API Routes (Next.js)        │  │
│  │  POST /api/transcribe              │  │
│  │  POST /api/summarize               │  │
│  │  POST /api/send-email              │  │
│  └──────┬──────────┬─────────┬────────┘  │
└─────────┼──────────┼─────────┼───────────┘
          │          │         │
    ┌─────▼───┐ ┌────▼───┐ ┌──▼─────┐
    │ AI API  │ │ AI API │ │ Resend │
    │ (Audio) │ │ (Text) │ │ (Email)│
    └─────────┘ └────────┘ └────────┘
```

### Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Unified frontend + API routes, deploys to Vercel |
| Audio Capture | MediaRecorder API | Browser-native, works on mobile Safari + Chrome |
| Transcription + Diarization | Gemini 2.5 Flash (default, swappable) | Romanian + English code-switching via prompting |
| Summarization | Gemini 2.5 Flash (text) | Same API key, summarize transcript + extract action items |
| Email | Resend API | Free tier (3K emails/month), simple REST |
| Storage | In-memory session state only | Single-session: record > transcribe > email > done. No DB. |
| Styling | Tailwind CSS v4 | Best fit for taste-skill patterns, mobile-first |
| Auth | NextAuth.js (Google OAuth) | Login required — enables meeting history in future |
| Deployment | Vercel (free tier) | HTTPS required for MediaRecorder |
| Network | Always-on WiFi assumed | No offline mode for v1 |
| UI Language | Romanian primary + English toggle | i18n via simple context, not a library |
| Max meeting length | 60 minutes | Audio chunking strategy built around this |

---

## Phase 1: Project Scaffold and Audio Recording (Backend-First)

### Step 1.1 — Initialize Next.js project
- [x] Create Next.js app with App Router
- [x] Configure TypeScript
- [x] Set up project structure (folders, base config)
- [x] Add `.env.local` template for API keys
- [x] Add `.gitignore`

### Step 1.2 — Audio recording engine
- [x] Implement MediaRecorder wrapper (custom hook: `useAudioRecorder`)
- [x] Handle browser codec differences (WebM/Opus for Chrome, MP4/AAC for Safari)
- [x] Implement recording state machine: `idle > recording > paused > stopped`
- [x] Chunk audio into manageable sizes for API upload (handle long meetings)
- [x] Add recording timer display
- [x] Test on mobile Safari (iOS) and Chrome (Android) — document any issues
- [x] Handle edge cases: permission denied, mic not found, tab backgrounding, phone lock screen

### Step 1.3 — Audio file handling
- [x] Convert recorded blobs to uploadable format
- [x] Implement audio compression if needed (keep file sizes reasonable for API)
- [x] Create utility to merge audio chunks if recording was paused/resumed
- [x] Add audio playback preview (so user can verify before transcribing)

---

## Phase 2: Transcription and Diarization (Core AI Integration)

### Step 2.1 — API route: `/api/transcribe`
- [x] Create Next.js API route that accepts audio file upload
- [x] Implement Gemini Audio API integration
- [x] Craft the Romanian + English code-switching system prompt
- [x] Implement speaker diarization via structured prompting
- [x] Return structured JSON response: `{ speakers: [...], segments: [{ speaker, text, timestamp }] }`
- [x] Handle API errors gracefully (rate limits, file size limits, timeouts)
- [x] Add request validation (file type, file size, etc.)

### Step 2.2 — Diarization prompt engineering
- [x] Write and test the diarization system prompt (Romanian-first, English terms preserved)
- [x] Test with multi-speaker audio samples
- [x] Tune prompt for consistent speaker labeling (Speaker 1, Speaker 2, etc.)
- [x] Handle edge case: single speaker (no diarization needed)
- [x] Handle edge case: overlapping speech

### Step 2.3 — Audio chunking strategy for long meetings
- [x] Determine max audio size for single API call (Handled by Gemini File API up to 2GB)
- [x] Implement sequential chunk processing for meetings > limit (Not needed for Gemini 2.5)
- [x] Maintain speaker consistency across chunks (carry speaker context forward) (Not needed)
- [x] Merge chunk results into unified transcript (Not needed)

---

## Phase 3: Summarization and Action Items

### Step 3.1 — API route: `/api/summarize` (Combined into `/api/transcribe`)
- [x] Create API route that accepts transcript text
- [x] Prompt AI to generate: meeting summary, key decisions, action items with assignees
- [x] Return structured response
- [x] Support Romanian output (summary in same language as meeting)

### Step 3.2 — Meeting metadata
- [x] Extract meeting duration from recording
- [x] Count number of speakers detected
- [x] Generate meeting title suggestion from content

---

## Phase 4: Email Distribution (Resend Integration) — CODE READY

### Step 4.1 — API route: `/api/email`
- [x] Create API route that integrates Resend SDK
- [x] Design a premium HTML email template for meeting summaries
- [x] Support attachments or embedded full transcript
- [x] Add error handling for invalid emails or API limits

### Step 4.2 — Client-side trigger
- [x] Implement logic to call `/api/email` automatically after transcription
- [x] Allow user to edit recipient list before sending (UI Step)
- [x] Optional: name each participant to map to Speaker 1, 2, etc.
- [x] Store participant list in local state for the session

---

## Phase 5: Frontend UI (Wizard Flow & Impeccable Design)

> Design decisions will be guided by **Impeccable** and **taste-skill** skills.
> We are using the "Wizard / Funnel" Structure (Option 2).

### Step 5.1 — Application State Management
- [x] Create a single-page wizard structure in `src/app/page.tsx` to handle in-memory transitions between: `setup > recording > processing > review`
- [x] Manage shared state: Meeting Title, Participants, Audio Blob, Transcript, Summary Data.

### Step 5.2 — Setup Screen UI
- [x] Build a sleek, typography-first landing view.
- [x] Create a form to input Meeting Title.
- [x] Create an intuitive email tag input system for participants.
- [x] Add the "Start Session" CTA.

### Step 5.3 — Recording Screen UI
- [x] Integrate `useAudioRecorder` hook.
- [x] Design a distraction-free focus screen.
- [x] Implement a large digital timer and a pulsing visual indicator.
- [x] Add a prominent "End Meeting" action button.

### Step 5.4 — Processing Screen UI
- [x] Implement the sequence: upload to `/api/upload` -> send URL to `/api/transcribe`.
- [x] Design a premium loading interstitial (e.g., Skeleton loaders or progressive status text).

### Step 5.5 — Review & Send Screen UI
- [x] Build a dashboard with Tabs: "AI Summary" vs "Full Transcript".
- [x] Format Key Decisions and Action Items beautifully (checkboxes/cards).
- [x] Add the "Approve & Send Emails" final CTA.
- [x] Handle the call to `/api/email` and display the final Success state.

---

## Phase 6: Integration and Testing

### Step 6.1 — End-to-end flow
- [ ] Test full workflow: Record > Transcribe > Summarize > Email
- [ ] Test with real Romanian + English mixed audio
- [ ] Test with 2, 3, 4+ speakers
- [ ] Test with different meeting lengths (5 min, 15 min, 30 min, 60 min)
- [ ] Test on iOS Safari, Android Chrome, Desktop Chrome

### Step 6.2 — Edge cases and error handling
- [ ] Network failure during upload
- [ ] API timeout during transcription
- [ ] Very noisy audio
- [ ] Single speaker meeting
- [ ] Very short recording (< 30 seconds)
- [ ] Browser tab backgrounded during recording

---

## Phase 7: Deployment

### Step 7.1 — Deploy to Vercel
- [ ] Configure environment variables on Vercel
- [ ] Deploy and test production build
- [ ] Verify HTTPS (required for MediaRecorder)
- [ ] Test on real phone with real meeting scenario

---

## Phase 8: Voice Recognition AI Comparison Test (Parallel / Post-Build)

> This phase runs independently and does NOT block the main build.
> Can start during Phase 2 or after Phase 7 — user decides.

### Step 8.1 — Test design
- [ ] Define test criteria: accuracy (WER), speaker identification, code-switching handling, speed, cost
- [ ] Prepare test audio samples: Romanian mono-speaker, Romanian multi-speaker, Romanian + English mixed, noisy environment
- [ ] User provides real-world recordings; I create synthetic test cases

### Step 8.2 — API integrations for testing
- [ ] **Gemini 2.0 Flash / Gemini 2.5** — Audio API with structured prompting
- [ ] **OpenAI Whisper / GPT-4o-transcribe** — `/v1/audio/transcriptions` endpoint
- [ ] **Deepgram Nova-3** — REST API with `language=ro` and `diarize=true`
- [ ] **AssemblyAI Universal-2** — REST API with `speaker_labels=true`
- [ ] **Google Cloud Speech-to-Text v2** — Chirp model with Romanian

### Step 8.3 — Test execution
- [ ] Build a test harness script (Node.js) that sends same audio to all APIs
- [ ] Collect results: raw transcript, speaker labels, timestamps, latency, cost
- [ ] User runs independent test with same audio (manual evaluation)

### Step 8.4 — Analysis and report
- [ ] Compare results across all APIs
- [ ] Score each on: Romanian accuracy, English term preservation, speaker diarization, noise handling, latency, cost per minute
- [ ] Generate comparison report (markdown table)
- [ ] Decide whether to swap the primary API based on results

### Candidate APIs — Quick Reference

| API | Romanian | Diarization | Code-Switching | Free Tier | Price/min |
|-----|----------|-------------|----------------|-----------|-----------|
| Gemini 2.0/2.5 Flash | Yes (prompted) | Yes (prompted) | Excellent (LLM-native) | 1,500 req/day free | ~$0.00 (free tier) |
| OpenAI Whisper/GPT-4o | Yes | No (separate) | Unpredictable | No free tier | ~$0.006/min |
| Deepgram Nova-3 | Yes (`ro`) | Yes (built-in) | Yes (`multi` mode) | $200 credit | ~$0.007/min |
| AssemblyAI Universal-2 | Yes | Yes (built-in) | Limited | Free trial | ~$0.01/min |
| Google Cloud STT v2 | Yes (Chirp) | Yes (built-in) | Limited | $300 credit | ~$0.016/min |

---

## Locked Decisions — 2026-04-28

| # | Decision | Choice |
|---|----------|--------|
| 1 | API Keys | Gemini key exists. Other keys (Resend, OpenAI, Deepgram, AssemblyAI) to be added when available |
| 2 | Deployment | Vercel free tier ✅ |
| 3 | Meeting length | 60 minutes max ✅ |
| 4 | Network | Always-on WiFi assumed. No offline mode. ✅ |
| 5 | Data persistence | Single-session only. No DB for v1. ✅ |
| 6 | UI Language | Romanian primary + English toggle (lightweight i18n) ✅ |
| 7 | Auth | Login required (NextAuth.js + Google OAuth) ✅ |
| 8 | Styling | Tailwind CSS v4 ✅ |

> All questions resolved. Execution begins at Phase 1, Step 1.1.
