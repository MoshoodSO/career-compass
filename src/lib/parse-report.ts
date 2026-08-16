export type Skill = { skill: string; explanation: string };
export type Report = {
  confidence_letter: string;
  cv_recommendations: string[];
  linkedin_recommendations: string[];
  transferable_skills: Skill[];
  can_apply: boolean;
  gaps_to_address: string[];
  career_fit_explanation: string;
};

/**
 * Attempts to close an incomplete JSON object/array produced by a truncated
 * LLM response, so the fields that DID arrive can still be rendered.
 */
function repairTruncatedJson(input: string): unknown {
  const text = input.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to repair */
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastSafe = -1; // index just after the last completed top-level-ish value

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
    else if (ch === ",") lastSafe = i;
  }

  // Drop anything after the last complete key/value pair, then close open scopes.
  let candidate = lastSafe > -1 ? text.slice(0, lastSafe) : text;
  for (let attempt = 0; attempt < 2; attempt++) {
    const closers = [...stack].reverse().join("");
    try {
      return JSON.parse(candidate + closers);
    } catch {
      candidate = candidate.replace(/,\s*$/, "");
      try {
        return JSON.parse(candidate + closers);
      } catch {
        stack.pop();
      }
    }
  }
  throw new Error("Could not repair truncated JSON");
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const asSkills = (value: unknown): Skill[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
        .map((v) => ({
          skill: typeof v["skill"] === "string" ? v["skill"] : "",
          explanation: typeof v["explanation"] === "string" ? v["explanation"] : "",
        }))
        .filter((s) => s.skill || s.explanation)
    : [];

/**
 * Normalises every shape the n8n webhook can return:
 *  - the report object itself
 *  - [ { ... } ]                (n8n item array)
 *  - { data: { ... } }
 *  - { output: "```json ..." }  (raw LLM text)
 *  - { error, raw: "..." }      (n8n JSON-parse failure, possibly truncated)
 */
export function parseReport(rawBody: string): Report {
  let value: unknown = repairTruncatedJson(stripCodeFence(rawBody));

  for (let depth = 0; depth < 5; depth++) {
    if (Array.isArray(value)) {
      value = value[0];
      continue;
    }
    if (!value || typeof value !== "object") break;
    const obj = value as Record<string, unknown>;
    if (typeof obj["confidence_letter"] === "string") break;

    const nested = obj["raw"] ?? obj["output"] ?? obj["text"] ?? obj["data"] ?? obj["json"];
    if (typeof nested === "string") {
      value = repairTruncatedJson(stripCodeFence(nested));
      continue;
    }
    if (nested && typeof nested === "object") {
      value = nested;
      continue;
    }
    break;
  }

  if (!value || typeof value !== "object") throw new Error("Unexpected response shape");
  const obj = value as Record<string, unknown>;

  const report: Report = {
    confidence_letter:
      typeof obj["confidence_letter"] === "string" ? obj["confidence_letter"] : "",
    cv_recommendations: asStringArray(obj["cv_recommendations"]),
    linkedin_recommendations: asStringArray(obj["linkedin_recommendations"]),
    transferable_skills: asSkills(obj["transferable_skills"]),
    can_apply: obj["can_apply"] !== false,
    gaps_to_address: asStringArray(obj["gaps_to_address"]),
    career_fit_explanation:
      typeof obj["career_fit_explanation"] === "string" ? obj["career_fit_explanation"] : "",
  };

  // A truncated answer still has value — only fail when nothing usable arrived.
  const hasContent =
    !!report.confidence_letter.trim() ||
    !!report.career_fit_explanation.trim() ||
    report.cv_recommendations.length > 0 ||
    report.linkedin_recommendations.length > 0 ||
    report.transferable_skills.length > 0 ||
    report.gaps_to_address.length > 0;
  if (!hasContent) throw new Error("Unexpected response shape");

  return report;
}


function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fence ? fence[1]! : trimmed;
}
