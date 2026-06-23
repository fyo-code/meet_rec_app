# Errors Log — Meeting Transcription App

> Every error, problem, difficulty, user correction, or mistake is logged here.
> This file is a living document. Entries are never deleted, only added.

---

## Format

Each entry follows this structure:
```
### [YYYY-MM-DD] [Step Reference] — [Category]
**What happened:** ...
**Root cause:** ...
**Resolution:** ...
**Lesson learned:** ...
```

**Categories:** `CODE_ERROR`, `API_ERROR`, `DESIGN_FEEDBACK`, `REQUIREMENT_MISUNDERSTANDING`, `USER_CORRECTION`, `PLAN_DEVIATION`, `TOOL_ISSUE`, `OTHER`

---

## Entries

### [2026-04-28] [Step 1.1] — CODE_ERROR
**What happened:** Running `npm install` failed with `No matching version found for @google/genai@^0.1.2`.
**Root cause:** Guessed an outdated/incorrect minor version for the newly released `@google/genai` SDK in `package.json`.
**Resolution:** Looked up the latest version via `npm info @google/genai version` (which is 1.50.1) and updated `package.json`.
### [2026-04-28] [Step 1.1] — DEPENDENCY_VULNERABILITIES
**What happened:** `npm install` reported 6 vulnerabilities (5 moderate, 1 high).
**Root cause:** Deep dependency tree issues from Next.js 15 and NextAuth v4 (which relies on older versions of `uuid` and `undici`).
**Resolution:** Ran `npm install @vercel/blob@latest next-auth@latest` to eliminate the high severity issues. The remaining moderate vulnerabilities belong to the `next-auth` v4 dependency tree. Fixing them requires migrating to NextAuth v5 (which is currently in beta). 
**Lesson learned:** Documented the vulnerability source. It is safe to proceed without forcing a breaking `next-auth@beta` upgrade for this project's scope.

### [2026-05-14] [Step 6.1] — API_ERROR
**What happened:** User recorded a 7-minute meeting on localhost. The raw transcript only contained content for the first ~25 seconds. The rest was silently dropped.
**Root cause:** The `generateContent` call in `route.ts` did not explicitly set `maxOutputTokens`. Gemini's default output token limit (~8,192) was far too small for a verbatim multi-speaker transcript with timestamps. Once the model hit the invisible ceiling, it stopped generating — producing a truncated transcript that *appeared* complete but was missing 6+ minutes of content.
**Resolution:** Added `maxOutputTokens: 65536` to the transcription call and `maxOutputTokens: 8192` to the summarization call. Also added `finishReason` logging to detect future truncations, and blob size logging on the client to verify full uploads.
**Lesson learned:** ALWAYS explicitly set `maxOutputTokens` when calling any LLM for long-form output. Never rely on defaults — they are tuned for chatbot-length responses, not full meeting transcripts. For a 60-minute meeting, expect 30,000–50,000+ tokens of transcript output.

### [2026-05-14] [Step 6.1] — API_ERROR
**What happened:** User recorded a 40-minute meeting. Gemini returned 0 characters of transcript with `finishReason: STOP`. The API call took 114 seconds (suggesting it tried to process something) but produced nothing.
**Root cause:** After uploading a large audio file via the Gemini Resumable Upload protocol, the file's `state` is `PROCESSING` — not yet `ACTIVE`. We were immediately sending the transcription request before Google finished indexing the audio. Gemini received the request, tried to read an unprocessed file, and returned empty text.
**Resolution:** Added a polling loop in `page.tsx` that checks the file state every 5 seconds (up to 5 minutes) via `GET /v1beta/files/{name}`. The transcription request is only sent after `state === 'ACTIVE'`. Also added full response structure logging in `route.ts` to catch empty responses with detailed diagnostics.
**Lesson learned:** The Gemini File API is asynchronous. Large file uploads complete the byte transfer immediately, but the file must be PROCESSED before it can be used in `generateContent`. Always poll the file status and wait for `ACTIVE` state before using the file URI in any model call.
