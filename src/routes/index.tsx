import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { parseReport, type Report } from "@/lib/parse-report";


const WEBHOOK_URL = "https://moshoodso.app.n8n.cloud/webhook/career-copilot"; 

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Career Copilot — Personalised CV & Job Fit Guidance" },
      {
        name: "description",
        content:
          "Upload your CV, paste a job description and LinkedIn info to get personalised career guidance in seconds.",
      },
      { property: "og:title", content: "Career Copilot — Personalised CV & Job Fit Guidance" },
      {
        property: "og:description",
        content:
          "Upload your CV, paste a job description and LinkedIn info to get personalised career guidance in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerCopilot,
});

type Skill = { skill: string; explanation: string };
type Report = {
  confidence_letter: string;
  cv_recommendations: string[];
  linkedin_recommendations: string[];
  transferable_skills: Skill[];
  can_apply: boolean;
  gaps_to_address: string[];
  career_fit_explanation: string;
};

const LOADING_MESSAGES = [
  "Reading your story...",
  "Matching your experience...",
  "Writing your guidance...",
];

const numbered = (items: string[]) => items.map((i, n) => `${n + 1}. ${i}`).join("\n");

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <button
      type="button"
      aria-label="Copy section content"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(getText());
        } catch {
          /* ignore */
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function AccordionCard({
  title,
  index,
  open,
  onToggle,
  copyText,
  children,
}: {
  title: string;
  index: number;
  open: boolean;
  onToggle: () => void;
  copyText: () => string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
            {index}
          </span>
          <h2 className="flex-1 text-lg font-semibold sm:text-xl">{title}</h2>
          <span
            className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        <CopyButton getText={copyText} />
      </div>
      {open && <div className="border-t border-border px-4 py-5 sm:px-6">{children}</div>}
    </section>
  );
}

const Paragraphs = ({ text, italic }: { text: string; italic?: boolean }) => (
  <div className={`space-y-4 ${italic ? "text-[1.08rem] italic sm:text-[1.15rem]" : ""}`}>
    {text
      .split(/\n\s*\n/)
      .filter((c) => c.trim())
      .map((chunk, i) => (
        <p key={i}>{chunk.trim()}</p>
      ))}
  </div>
);

const NumberedList = ({ items }: { items: string[] }) => (
  <ol className="list-decimal space-y-3 pl-6 marker:font-semibold marker:text-primary">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ol>
);

function CareerCopilot() {
  const [status, setStatus] = useState<"form" | "loading" | "results">("form");
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [openCard, setOpenCard] = useState<number | null>(1);

  useEffect(() => {
    if (status !== "loading") return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_MESSAGES.length), 3000);
    return () => clearInterval(id);
  }, [status]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const cv = (form.elements.namedItem("cv") as HTMLInputElement).files?.[0];
    const linkedin = (form.elements.namedItem("linkedin_pdf") as HTMLInputElement).files?.[0];

    const data = new FormData();
    if (cv) data.append("cv", cv);
    data.append("job_description", jobDescription);
    if (linkedin) data.append("linkedin_pdf", linkedin);

    setError("");
    setStatus("loading");
    try {
      const res = await fetch(WEBHOOK_URL, { method: "POST", body: data });
      const raw = await res.text();
      if (!res.ok) {
        console.error("Webhook error", res.status, raw);
        throw new Error(`Request failed (${res.status})`);
      }
      if (!raw.trim()) {
        console.error("Webhook returned an empty body");
        throw new Error("Empty response");
      }
      const parsed = JSON.parse(raw) as Report | Report[] | { data?: Report };
      const json = (Array.isArray(parsed) ? parsed[0] : "data" in parsed && parsed.data ? parsed.data : parsed) as Report;
      if (!json || typeof json !== "object" || !json.confidence_letter) {
        console.error("Unexpected webhook payload", parsed);
        throw new Error("Unexpected response shape");
      }
      setReport(json);
      setOpenCard(1);
      setStatus("results");
    } catch (err) {
      console.error("Career Copilot request failed:", err);
      setError("Something went wrong — please try again.");
      setStatus("form");
    }
  };

  const toggle = (n: number) => setOpenCard((c) => (c === n ? null : n));

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {status === "form" && (
        <>
          <header className="mb-10">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Career Copilot</h1>
            <p className="mt-3 text-muted-foreground">
              Upload your CV, paste the job description and LinkedIn info — get personalised
              guidance in seconds.
            </p>
          </header>

          {error && (
            <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <label htmlFor="cv" className="block text-lg font-semibold">
                Your CV (PDF)
              </label>
              <input
                id="cv"
                name="cv"
                type="file"
                accept=".pdf"
                className="mt-3 block w-full cursor-pointer rounded-xl border border-dashed border-input bg-background px-4 py-3 text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <label htmlFor="job_description" className="block text-lg font-semibold">
                Job Description
              </label>
              <textarea
                id="job_description"
                name="job_description"
                rows={12}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here"
                className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <label htmlFor="linkedin_pdf" className="block text-lg font-semibold">
                LinkedIn Profile
              </label>
              <p className="mt-1 text-sm text-muted-foreground">LinkedIn PDF</p>
              <input
                id="linkedin_pdf"
                name="linkedin_pdf"
                type="file"
                accept=".pdf"
                aria-label="LinkedIn PDF"
                className="mt-3 block w-full cursor-pointer rounded-xl border border-dashed border-input bg-background px-4 py-3 text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Analyse my profile →
            </button>
          </form>
        </>
      )}

      {status === "loading" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <span className="size-12 animate-spin rounded-full border-4 border-secondary border-t-primary" />
          <p className="text-xl font-medium" aria-live="polite">
            {LOADING_MESSAGES[loadingStep]}
          </p>
        </div>
      )}

      {status === "results" && report && (
        <>
          <button
            type="button"
            onClick={() => setStatus("form")}
            className="mb-6 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            ← Start over
          </button>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your Career Copilot Report
          </h1>
          <p className="mt-2 mb-8 text-muted-foreground">
            Click any section to expand it. Use the copy button to grab the content.
          </p>

          <div className="space-y-4">
            <AccordionCard
              index={1}
              title="Why you can do this"
              open={openCard === 1}
              onToggle={() => toggle(1)}
              copyText={() => report.confidence_letter}
            >
              <Paragraphs text={report.confidence_letter} italic />
            </AccordionCard>

            <AccordionCard
              index={2}
              title="Strengthen your CV"
              open={openCard === 2}
              onToggle={() => toggle(2)}
              copyText={() => numbered(report.cv_recommendations ?? [])}
            >
              <NumberedList items={report.cv_recommendations ?? []} />
            </AccordionCard>

            <AccordionCard
              index={3}
              title="Update your LinkedIn"
              open={openCard === 3}
              onToggle={() => toggle(3)}
              copyText={() => numbered(report.linkedin_recommendations ?? [])}
            >
              <NumberedList items={report.linkedin_recommendations ?? []} />
            </AccordionCard>

            <AccordionCard
              index={4}
              title="Your transferable skills"
              open={openCard === 4}
              onToggle={() => toggle(4)}
              copyText={() =>
                [
                  (report.transferable_skills ?? [])
                    .map((s) => `${s.skill}: ${s.explanation}`)
                    .join("\n"),
                  report.can_apply ? "Apply with confidence" : "Apply — but prepare these gaps",
                  `Prepare for interview:\n${numbered(report.gaps_to_address ?? [])}`,
                ].join("\n\n")
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {(report.transferable_skills ?? []).map((s, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/60 p-4">
                    <p className="font-semibold">{s.skill}</p>
                    <p className="mt-1 text-[0.95rem] text-muted-foreground">{s.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <span
                  className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
                    report.can_apply
                      ? "bg-success text-success-foreground"
                      : "bg-warning text-warning-foreground"
                  }`}
                >
                  {report.can_apply ? "Apply with confidence" : "Apply — but prepare these gaps"}
                </span>
              </div>

              <h3 className="mt-6 mb-3 text-base font-semibold">Prepare for interview:</h3>
              <NumberedList items={report.gaps_to_address ?? []} />
            </AccordionCard>

            <AccordionCard
              index={5}
              title="How you fit this role"
              open={openCard === 5}
              onToggle={() => toggle(5)}
              copyText={() => report.career_fit_explanation}
            >
              <Paragraphs text={report.career_fit_explanation} />
            </AccordionCard>
          </div>
        </>
      )}
    </main>
  );
}
