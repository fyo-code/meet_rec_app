# Meeting Transcription App — Project Rules

## Rule 1: 95% Clarity Gate
Before executing or making ANY decision (code, architecture, design, API choice, anything):
- If there is NOT 95% clarity on what to do, **STOP and ask questions**.
- Keep asking until you reach 95% understanding of the context, requirements, intent, and implications.
- Do NOT guess. Do NOT assume. Do NOT proceed with uncertainty.

## Rule 2: Plan-First Execution
Before executing ANY step:
- **Read and check** the `PLAN.md` file in this project root.
- Confirm which step you're on and what it requires.
- Do not deviate from the plan without explicit user approval.

## Rule 3: Sequential Step Execution
- Do NOT move to the next step until the user explicitly confirms the current step is complete.
- "Done" is not enough — wait for the user to say "move on", "next", "approved", or equivalent.
- If a step has sub-tasks, complete all sub-tasks before asking for step approval.

## Rule 4: Error Logging (Mandatory)
Every error, problem, difficulty, or mistake — regardless of how small — MUST be logged in `ERRORS_LOG.md`:
- Code errors that were later fixed
- API integration problems
- User feedback about disliking an approach or output
- Misunderstandings of requirements
- User corrections ("don't do X again")
- Design decisions that were reversed
- Any deviation from the plan

Format each entry with: date, step reference, description, resolution, and lesson learned.

## Design System
- Design decisions are guided by the **Impeccable** and **taste-skill** family of skills.
- No preset design system. Adapt design choices to the app's actual needs as we build.
- No GEMINI.md cinematic landing page rules. Those are deleted and irrelevant.
