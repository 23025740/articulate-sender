## Smart Email Generator

A clean, professional single-page app that generates context-aware emails using Lovable AI, with local history, refinement, and copy/download.

### Core flow
1. User fills a form: purpose, key details, audience, tone, length, optional CTA, optional sender name.
2. Click **Generate** → streams a structured email (Subject + Body) from Lovable AI.
3. Result card shows subject, greeting, body, sign-off. Actions: **Copy**, **Download .txt**, **Download .eml**, **Refine**, **Regenerate**.
4. Each generation auto-saves to local history (localStorage). Sidebar lists past emails; click to reopen.

### Screens / layout
- Single route `/` with a two-pane layout:
  - **Left (sidebar):** app title, "New email" button, history list (title = subject, subtitle = audience · tone · date), clear-history action.
  - **Right (main):** the form on top, generated email card below. On mobile, sidebar collapses into a Sheet.

### Form fields
- Purpose (textarea, required)
- Key details (textarea, required) — bullet-friendly
- Audience (select): Client, Manager, Team Member, Executive, Vendor, Other
- Tone (select): Formal, Informal, Persuasive, Friendly, Professional, Apologetic, Appreciative, Urgent
- Length (segmented): Short / Medium / Detailed
- Call-to-action (input, optional)
- Sender name (input, optional)

### Refine
After a result, a "Refine" input lets the user describe a tweak ("make it shorter", "more apologetic", "add a line about Q3 numbers"). Sends the previous email + instruction back to the model for a revised version. Refined versions replace the current result; original stays in history.

### Design direction
Clean & professional palette: near-white background `#fafbfc`, soft border `#e8ecf1`, muted text `#94a3b8`, primary `#3b82f6`. Typography: Inter for body, a refined display font (e.g. Space Grotesk) for headings. Generous whitespace, subtle card shadows, rounded-xl, focused single-column form, no decorative gradients. All colors defined as oklch tokens in `src/styles.css`.

### Technical details
- **Stack:** existing TanStack Start template. New route `src/routes/index.tsx` replaces placeholder.
- **AI backend:** server route `src/routes/api/generate-email.ts` using AI SDK `streamText` via Lovable AI Gateway provider (`google/gemini-3-flash-preview`). System prompt encodes the "Smart Email Generator" rules (structure, tone adaptation, audience adaptation, quality standards). Returns a UI message stream consumed via `useChat` with `DefaultChatTransport`.
- **Structured output:** the server prompt instructs the model to output a strict format starting with `Subject: ...` on the first line, then a blank line, then the email body (greeting → body → sign-off). Client parses subject vs body for display.
- **AI Gateway helper:** add `src/lib/ai-gateway.server.ts` using `@ai-sdk/openai-compatible` (baseURL `https://ai.gateway.lovable.dev/v1`, `Lovable-API-Key` header from `process.env.LOVABLE_API_KEY`). Provision `LOVABLE_API_KEY` via the AI Gateway tool.
- **Local history:** `src/lib/history.ts` wraps localStorage (key `seg.history.v1`); stores `{ id, createdAt, inputs, subject, body }`. Cap at 50 entries.
- **Downloads:** plain `.txt` (subject + body) and `.eml` (RFC 822 minimal: `Subject:` header + blank line + body) generated client-side via Blob.
- **Copy:** `navigator.clipboard.writeText` with a Sonner toast confirmation.
- **Components:** reuse shadcn `Button`, `Input`, `Textarea`, `Select`, `Card`, `Sheet`, `Separator`, `Sonner`. New components: `EmailForm`, `EmailResult`, `HistorySidebar`, `RefineBar`.
- **Errors:** surface 402 (credits) and 429 (rate limit) from the gateway as inline toasts with actionable copy.

### Out of scope
- No accounts, no Lovable Cloud, no database.
- No multi-variation generation (per your selection).
- No actual email sending — generation + copy/download only.
