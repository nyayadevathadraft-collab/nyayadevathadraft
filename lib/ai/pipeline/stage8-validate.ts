import { getFlashModel } from "../gemini";
import type { Stage7Output, Stage4Output, Stage6Output, Stage8Output, ReviewFlag } from "./types";

export async function runStage8(
  stage7: Stage7Output,
  stage4: Stage4Output,
  stage6: Stage6Output,
  context: { caseType: string; court: string }
): Promise<Stage8Output> {
  const draftText = stage7.draft.sections.map((s) => s.content).join("\n");
  const model = getFlashModel();

  const result = await model.generateContent(`
You are a quality-control system for Indian legal drafts. Validate the draft below.

Court: ${context.court}
Case type: ${context.caseType}

─── DRAFT ───
${draftText.slice(0, 30000)}

─── VERIFIED STATUTES (only these may be cited) ───
${stage4.statutes.map((s) => `Section ${s.section}, ${s.actName}`).join("\n")}

─── APPROVED AUTHORITIES (only these may be cited) ───
${stage6.includedAuthorities.map((a) => `${a.caseTitle} [${a.citation ?? "No citation"}]`).join("\n")}

Check for:
1. Citations to statutes NOT in the verified list → "blocked" + flag as error
2. Case citations NOT in the approved authority list → "blocked" + flag as error
3. Invented or unverifiable section/case references → blocked + error
4. Missing court heading or cause title → warning
5. Missing prayer clause → warning
6. Missing verification → warning
7. Date conflicts → warning
8. Placeholders [INSERT:...] still present → info
9. Sensitive personal data (Aadhaar, PAN, minors, medical) without redaction flag → warning
10. Potential limitation period issues → warning

Return JSON:
{
  "reviewFlags": [
    {
      "type": "unverified_citation|missing_verification|date_conflict|incorrect_heading|potential_limitation|missing_prayer|incomplete_annexure|sensitive_data|blocked_citation",
      "message": "<specific issue>",
      "severity": "error|warning|info",
      "location": "<para or section where found, if determinable>"
    }
  ],
  "citationValidation": [
    {
      "citation": "<exact citation string>",
      "state": "verified|unverified|blocked",
      "note": "<reason if blocked or unverified>"
    }
  ],
  "overallConfidence": <0.0-1.0>,
  "readyToExport": <true only if no errors>
}

Be strict. It is better to flag too many issues than to miss one.
`);

  const parsed = JSON.parse(result.response.text()) as Stage8Output;

  // Rule engine additions
  const ruleFlags: ReviewFlag[] = [];

  if (stage7.draft.missingPlaceholders.length > 0) {
    ruleFlags.push({
      type: "placeholder_present",
      message: `${stage7.draft.missingPlaceholders.length} placeholder(s) remain unfilled: ${stage7.draft.missingPlaceholders.slice(0, 3).join(", ")}`,
      severity: "warning",
    });
  }

  const HIGH_RISK_TYPES = ["criminal", "bail", "constitutional", "insolvency", "family"];
  if (HIGH_RISK_TYPES.some((t) => context.caseType.toLowerCase().includes(t))) {
    ruleFlags.push({
      type: "high_risk_matter",
      message: "High-risk matter type — enhanced review recommended before filing.",
      severity: "info",
    });
  }

  return {
    ...parsed,
    reviewFlags: [...(parsed.reviewFlags ?? []), ...ruleFlags],
  };
}
