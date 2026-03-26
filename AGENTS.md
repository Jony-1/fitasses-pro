# Agent Playbook

This repository is an Astro + TypeScript app with Node/Postgres backend code.
Use this file as the default operating guide for agentic work in this repo.

## Repo Snapshot

- Package manager: `npm` (lockfile present).
- App entry scripts live in `package.json`.
- Source lives under `src/`.
- API routes live under `src/pages/api/`.
- Shared logic lives under `src/lib/`.
- DB access uses `postgres` + `drizzle-orm`.
- Styling uses Astro + Tailwind v4 tooling.
- TypeScript strict mode is enabled via `astro/tsconfigs/strict`.

## Existing Agent Rules

- No `.cursor/rules/` files were present in the repo when this guide was written.
- No `.cursorrules` file was present.
- No `.github/copilot-instructions.md` file was present.

## Common Commands

- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Local preview: `npm run preview`
- Run Astro CLI directly: `npm run astro -- <command>`

## Build / Lint / Test

- There is no dedicated `lint` script in `package.json`.
- There is no dedicated `test` script or test runner configured yet.
- The main verification command today is `npm run build`.
- For type/diagnostic checking without a full build, use `npm run astro -- check`.
- If you add tests, prefer a focused command for the relevant file or suite only.
- When editing a single route or utility, rerun the smallest useful verification step.

## Single-File / Focused Verification

- No test files currently exist, so there is no repo-specific “run one test file” command.
- If tests are added later, document the exact command next to the test tool.
- For now, use one of these as a focused check:
  - `npm run astro -- check` for type and Astro diagnostics.
  - `npm run build` if you need the closest end-to-end verification.
- When working on DB or API code, validate the touched route behavior manually if needed.

## File Organization

- Keep route handlers in `src/pages/api/**`.
- Keep reusable auth/db/helpers in `src/lib/**`.
- Prefer small, composable helper functions instead of large route bodies.
- Match the existing feature area when adding new files.
- Preserve the current Spanish UI/API message style unless the repo is being normalized.

## Imports

- Use ES module imports only.
- Prefer package imports first, then local relative imports.
- Use type-only imports where possible (`import type { ... }`).
- Keep imports sorted and grouped logically.
- Avoid deep relative paths when a nearby index/helper file exists.

## Formatting

- Follow the surrounding file’s style when editing existing code.
- Most source files use semicolons and double quotes.
- Keep line breaks readable; split long SQL/template literals and parameter lists.
- Use blank lines to separate logical sections, not every statement.
- Preserve the repo’s current indentation style in the file you touch.
- Prefer explicit return objects over dense inline expressions when clarity helps.

## UI / Responsive

- Treat mobile-first responsiveness as mandatory in every visual change.
- Avoid fixed widths or heights unless they are essential; prefer fluid spacing and `min/max-*` utilities.
- Stack actions, forms, and cards on small screens; only switch to horizontal layouts from `sm`/`md` upward when it improves readability.
- Use `overflow-x-auto` for wide tables and horizontal content instead of letting the page overflow.
- Keep shared UI components responsive so page-level fixes do not need to be repeated everywhere.
- When editing Tailwind classes, preserve contrast, focus states, and dark mode support.

## Types

- This is a strict TypeScript codebase; avoid `any` unless there is no safe alternative.
- Use `unknown` for untrusted input and narrow it with runtime checks.
- Add explicit parameter and return types on exported helpers when practical.
- Use union literals for role/state values instead of free-form strings.
- Prefer `null` for absent database values when that matches existing code.

## Naming

- Use `camelCase` for variables, functions, and helpers.
- Use `UPPER_SNAKE_CASE` for constants.
- Use descriptive names that reflect domain terms: `client`, `trainer`, `session`, `assessment`.
- Keep route filenames aligned with URL shape and existing conventions.
- Preserve existing Spanish labels/errors if you are modifying user-facing messages.

## API Route Conventions

- Export HTTP verbs as named constants (`GET`, `POST`, `PUT`, `DELETE`).
- Declare routes with `APIRoute` from `astro`.
- Parse and validate request data at the top of the handler.
- Return early on invalid input.
- Use small local helpers like `json()` or redirect helpers when repeated.
- Keep redirect targets and status codes explicit.

## Error Handling

- Wrap DB/auth-heavy handlers in `try/catch`.
- Log unexpected failures with `console.error` and a short context label.
- Return user-safe errors; do not expose stack traces or raw SQL errors.
- Map authorization failures to clear `403` responses or redirects.
- Translate known DB constraint errors into friendly conflict messages.
- Keep error strings consistent with the rest of the app.

## Validation

- Normalize inputs before using them (`trim`, lowercase emails, number parsing).
- Validate required fields before touching the database.
- Use regex helpers for structured values when already established in the codebase.
- Treat empty strings, `undefined`, and `null` carefully and consistently.
- Prefer reusable validation helpers in `src/lib/utils/validation.ts`.

## Database Access

- Use the shared `sql`/`db` clients from `src/lib/db/client.ts`.
- Keep SQL parameterized via template literals; do not concatenate user input.
- Use `RETURNING` when the handler needs the inserted/updated record.
- Clean up expired sessions or stale records when the flow already touches them.
- Prefer database-level constraints plus application validation.

## Auth / Security

- Session cookies should remain `httpOnly`, `sameSite: "lax"`, and `secure` in production.
- Only set cookies through the shared session helpers when possible.
- Gate privileged actions with the guard helpers in `src/lib/auth/guards.ts`.
- Treat authorization errors as expected flow, not as crashes.
- Never commit secrets, credentials, or `.env` contents.

## Environment

- `DATABASE_URL` is required by `src/lib/db/client.ts`.
- `import.meta.env.PROD` is used for cookie security behavior.
- Check environment-dependent code carefully before deploying changes.

## Writing Style for Agents

- Make the smallest change that solves the request.
- Prefer existing patterns over introducing new abstractions.
- Update nearby code paths together when behavior must stay consistent.
- Avoid broad refactors unless the user asked for them.
- Do not overwrite unrelated work in the tree.

## Before Finishing

- Re-read the touched files for consistency.
- Run the smallest useful verification command.
- If the change affects auth, API shape, or DB behavior, validate the full flow.
- If you added a new convention, update this file too.
