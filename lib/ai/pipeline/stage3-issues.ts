import { getProModel } from "../gemini";
import type { Stage2Output, Stage3Output } from "./types";

// BNS commencement date — 1 July 2024
const BNS_COMMENCEMENT = new Date("2024-07-01");

export async function runStage3(
  stage2: Stage2Output,
  context: { caseType: string; court: string }
): Promise<Stage3Output> {
  const model = getProModel();

  const result = await model.generateContent(`
You are a senior Indian advocate specialising in ${context.caseType} law.
Identify all legal issues in this matter based on the verified facts below.

Court: ${context.court}
Facts: ${JSON.stringify(stage2.facts, null, 2)}
Timeline: ${JSON.stringify(stage2.timeline, null, 2)}

CRITICAL — BNS/BNSS/BSA Transition Analysis:
- Bharatiya Nyaya Sanhita 2023 (BNS), Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS),
  and Bharatiya Sakshya Adhiniyam 2023 (BSA) commenced on 1 July 2024.
- Offences alleged BEFORE 1 July 2024 are typically governed by IPC/CrPC/Evidence Act
  subject to savings provisions in Section 531 BNSS.
- Offences alleged ON OR AFTER 1 July 2024 are governed by BNS/BNSS/BSA.
- If the incident date is unclear, flag for advocate review — do NOT assume.

Return JSON:
{
  "issues": [
    {
      "description": "<legal issue>",
      "proceduralStage": "<stage>",
      "applicableActs": ["<Act name>"],
      "transitionFlag": false,
      "transitionNote": null,
      "relatedFactIndices": [<indices into facts array>]
    }
  ],
  "applicableActs": ["<distinct list of all applicable Acts>"],
  "bnsApplicable": <true if incident on/after 1 July 2024>,
  "legacyLawQuestion": <true if uncertain or pre-BNS>,
  "incidentDate": "<ISO date from facts or null>",
  "transitionAnalysis": "<brief analysis for advocate review>"
}

Do not assume BNS applies without evidence that the incident occurred on or after 1 July 2024.
`);

  const parsed = JSON.parse(result.response.text()) as Stage3Output;
  return parsed;
}
