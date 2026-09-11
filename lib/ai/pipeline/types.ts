// Shared JSON payloads between pipeline stages.
// Each stage receives the accumulator and adds its own output.

export interface ExtractedEntity {
  type: "person" | "date" | "place" | "case_number" | "fir_number" | "section" | "act" | "court" | "police_station" | "prayer" | "other";
  value: string;
  page?: number;
  confidence: number;
}

export interface Stage1Output {
  documents: {
    documentId: string;
    filename: string;
    ocrText: string;
    geminiFileUri?: string;
    entities: ExtractedEntity[];
    pageCount: number;
  }[];
}

export interface FactItem {
  text: string;
  category: "chronology" | "party" | "evidence" | "allegation" | "prayer" | "procedural" | "other";
  sourceDocId?: string;
  sourcePage?: number;
  confidence: number;
  status: "confirmed" | "assumption" | "gap" | "user_provided";
}

export interface Stage2Output {
  facts: FactItem[];
  timeline: { date?: string; event: string; sourceDocId?: string }[];
  missingFacts: string[];
  contradictions: { description: string; factIds: string[] }[];
}

export interface LegalIssueItem {
  description: string;
  proceduralStage?: string;
  applicableActs: string[];
  transitionFlag: boolean;
  transitionNote?: string;
  relatedFactIndices: number[];
}

export interface Stage3Output {
  issues: LegalIssueItem[];
  applicableActs: string[];
  bnsApplicable: boolean;
  legacyLawQuestion: boolean;
  incidentDate?: string;
  transitionAnalysis?: string;
}

export interface StatuteItem {
  actName: string;
  section: string;
  subsection?: string;
  text: string;
  sourceUrl: string;
  isOfficial: boolean;
  retrievedAt: string;
  dbId?: string;
}

export interface Stage4Output {
  statutes: StatuteItem[];
  unresolvedSections: { actName: string; section: string; reason: string }[];
}

export interface AuthorityItem {
  caseTitle: string;
  citation?: string;
  court: string;
  bench?: string;
  judgmentDate?: string;
  holding: string;
  relevantParas?: string[];
  treatment: "binding" | "persuasive" | "overruled" | "analogous";
  similarityScore: number;
  relevanceNote: string;
  sourceUrl: string;
  verified: boolean;
  dbId?: string;
}

export interface Stage5Output {
  suggestedAuthorities: AuthorityItem[];
}

export interface Stage6Output {
  includedAuthorities: AuthorityItem[];
  excludedAuthorities: AuthorityItem[];
  researchOnlyAuthorities: AuthorityItem[];
}

export interface DraftSection {
  id: string;
  type: "heading" | "paragraph" | "prayer" | "verification" | "annexure" | "placeholder";
  content: string;
  citations: string[];
  sourceRefs: string[];
  assertionType: "user_fact" | "extracted_fact" | "legal_proposition" | "drafting_assumption";
  confidence: number;
}

export interface Stage7Output {
  draft: {
    courtHeading: string;
    causeTitle: string;
    documentTitle: string;
    sections: DraftSection[];
    draftingNotes: string;
    missingPlaceholders: string[];
  };
}

export interface ReviewFlag {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  location?: string;
}

export interface Stage8Output {
  reviewFlags: ReviewFlag[];
  citationValidation: {
    citation: string;
    state: "verified" | "unverified" | "blocked";
    note?: string;
  }[];
  overallConfidence: number;
  readyToExport: boolean;
}

export interface PipelineAccumulator {
  matterId: string;
  tenantId: string;
  userId: string;
  court: string;
  state: string;
  caseType: string;
  side: string;
  documentType: string;
  stage1?: Stage1Output;
  stage2?: Stage2Output;
  stage3?: Stage3Output;
  stage4?: Stage4Output;
  stage5?: Stage5Output;
  stage6?: Stage6Output;
  stage7?: Stage7Output;
  stage8?: Stage8Output;
}
