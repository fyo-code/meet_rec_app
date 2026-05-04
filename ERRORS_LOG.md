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
