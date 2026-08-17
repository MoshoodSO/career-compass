# Career Compass (Career Copilot)

A responsive React single-page app that analyzes a CV, job description, and optional LinkedIn PDF to generate tailored career guidance. Built with TanStack Start + React and intended to POST user inputs to a webhook which returns a structured JSON report.

Important: This project is connected to Lovable (https://lovable.dev). Avoid rewriting published git history (force-pushes, rebasing/amending/squashing commits already pushed) — changes sync back to Lovable and rewriting history may cause loss of project history.

---

Table of contents
- [Key features](#key-features)
- [Demo data / API contract](#demo-data--api-contract)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started (installation)](#getting-started-installation)
- [Development & build scripts](#development--build-scripts)
- [Usage examples](#usage-examples)
  - [Client: submit form (example)](#client-submit-form-example)
  - [Webhook: expected response shape (example)](#webhook-expected-response-shape-example)
  - [Curl example for webhook testing](#curl-example-for-webhook-testing)
- [Contributing](#contributing)
- [License](#license)

---

## Key features
- Upload your CV (PDF), paste a job description, and optionally upload a LinkedIn PDF.
- Simple, accessible two-state UI: Form and Results.
- Intentional loading states with helpful progress messages while the report is generated.
- Results rendered as five distinct, copyable accordion cards:
  1. Confidence / cover-style letter
  2. CV recommendations
  3. LinkedIn recommendations
  4. Transferable skills + gaps + apply verdict
  5. Career fit explanation
- No client-side paid APIs — the front-end POSTs a FormData payload to a webhook that performs analysis and returns a JSON object with a fixed contract (see below).
- Built with an accessible component library (Radix UI primitives + UI helpers), Tailwind-based styling, and TanStack React Start routing.

---

## Demo data / API contract

The front-end expects the webhook to return a JSON object with the exact keys below (do not rename):

- `confidence_letter` — string
- `cv_recommendations` — array of strings
- `linkedin_recommendations` — array of strings
- `transferable_skills` — array of objects: { "skill": string, "explanation": string }
- `can_apply` — boolean
- `gaps_to_address` — array of strings
- `career_fit_explanation` — string

Form fields posted (FormData keys):
- `cv` — CV PDF file (file input)
- `job_description` — job description text (textarea)
- `linkedin_pdf` — LinkedIn PDF file (optional)

The app sends a POST with a FormData object and does not set Content-Type manually (let the browser set the appropriate multipart form boundary).

---

## Tech stack
- Language: TypeScript
- Framework / runtime: React (v19) + TanStack React Start (file-based routes)
- Bundler: Vite
- Styling: Tailwind CSS (with utility components)
- Key libraries:
  - @tanstack/react-start, @tanstack/react-router, @tanstack/react-query
  - Radix UI primitives for accessible UI
  - react-hook-form and zod for form handling/validation
  - lucide-react for icons
  - sonner for toast/notifications

(See `package.json` for the full dependency list.)

---

## Project structure (top-level highlights)
```text
.
├─ public/                 # static assets (favicon, robots.txt)
├─ src/
│  ├─ components/          # UI components (lots of Radix + Tailwind primitives)
│  │  └─ ui/               # small UI primitives (button, accordion, input, etc.)
│  ├─ hooks/               # shared hooks
│  ├─ lib/                 # server-side helpers (error-capture, error-page, etc.)
│  ├─ routes/              # file-based routes (index.tsx, __root.tsx, etc.)
│  ├─ router.tsx           # router entry
│  ├─ server.ts            # Cloudflare / SSR adapter entrypoint
│  ├─ start.ts             # app boot
│  └─ styles.css           # global styles
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ .lovable/               # Lovable project sync metadata
```

How it fits together:
- The UI is a Vite-powered React SPA using TanStack Start's file-based routes. The main form collects the CV, job description, and optional LinkedIn PDF, bundles them in a FormData POST to the configured webhook, and displays the returned JSON in five accordion-style cards. Server-side helper files (src/lib, src/server.ts) handle SSR entry and error rendering.

---

## Getting started (installation)

Prerequisites
- Node.js 18+ (or a compatible environment such as Bun). The project includes a `bun.lock` but the app works with npm/yarn/pnpm.
- Git

Clone and run locally:
```bash
git clone https://github.com/MoshoodSO/career-compass.git
cd career-compass

# Install dependencies (npm shown - you can use yarn/pnpm/bun)
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 (or the Vite dev URL printed in your terminal) to view the app.

Environment / webhook
- The front-end POSTs to a webhook URL; by default the project README mentions `WEBHOOK_URL_PLACEHOLDER`. Replace this placeholder in the client configuration (or use an env variable and inject it in the build) to point to your analysis webhook.
- Make sure your webhook returns the JSON object matching the API contract above.

---

## Development & build scripts

Common npm scripts (see `package.json`):
- `npm run dev` — start Vite dev server
- `npm run build` — build production bundle
- `npm run build:dev` — build in development mode
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint across the repo
- `npm run format` — run Prettier to format code

---

## Usage examples

Client: submit form (example)
```ts
// Example client-side snippet showing how the app sends data.
// The app's UI does this automatically; this is an example of the same approach.
async function submitProfile({ cvFile, jobDescription, linkedinFile, webhookUrl }: {
  cvFile: File,
  jobDescription: string,
  linkedinFile?: File,
  webhookUrl: string
}) {
  const fd = new FormData();
  fd.set("cv", cvFile);
  fd.set("job_description", jobDescription);
  if (linkedinFile) fd.set("linkedin_pdf", linkedinFile);

  const res = await fetch(webhookUrl, { method: "POST", body: fd });
  if (!res.ok) throw new Error('Something went wrong — please try again.');

  const json = await res.json();
  // json must contain the exact keys specified in the API contract
  return json;
}
```

Webhook: expected response shape (example)
```json
{
  "confidence_letter": "Dear Hiring Team...\n\nI believe I am a strong fit because...",
  "cv_recommendations": [
    "Add metrics for your last role (e.g., increased conversion by 20%).",
    "Re-order skills to highlight JavaScript/TypeScript experience."
  ],
  "linkedin_recommendations": [
    "Add a concise summary emphasizing product + engineering experience.",
    "Include a few bullets under your latest role with measurable outcomes."
  ],
  "transferable_skills": [
    { "skill": "Problem solving", "explanation": "Led cross-functional bug triage and reduced cycle time..." },
    { "skill": "Communication", "explanation": "Presented roadmap to stakeholders and synthesized feedback..." }
  ],
  "can_apply": true,
  "gaps_to_address": [
    "Familiarize yourself with GraphQL basics.",
    "Prepare examples of system design at scale."
  ],
  "career_fit_explanation": "Based on your experience in X, Y and the job requirements, you are a reasonable match because..."
}
```

Curl example for webhook testing
```bash
curl -X POST "https://your-webhook.example/analysis" \
  -F "cv=@/path/to/resume.pdf" \
  -F "job_description=Paste the job description here..." \
  -F "linkedin_pdf=@/path/to/linkedin.pdf"
```

---

## Contributing
- Please open issues or PRs for bugs, improvements, or new features.
- Keep changes small and focused. If you use the Lovable editor, remember that commits sync back to this repository; avoid force-pushing or history-rewriting operations for branches that are published/synced.

Developer notes
- The app uses TanStack Start file-based routing — route files live in `src/routes/`. See `src/routes/README.md` for routing conventions.
- UI primitives live under `src/components/ui/` and are composed into the app pages.

---

## License
This project is provided under the MIT License. See the LICENSE file for details.

---
If you need the README committed to the repository, I can prepare the commit message and the file contents for you to apply.
