export interface StatuteQuery {
  actName?: string;
  section?: string;
  keywords?: string;
  asOf?: Date;
}

export interface SectionResult {
  actName: string;
  section: string;
  subsection?: string;
  title?: string;
  text: string;
  commencementDate?: Date;
  amendmentHistory?: AmendmentEntry[];
  sourceUrl: string;
  retrievedAt: Date;
  isOfficial: boolean;
  connectorId: string;
}

export interface AmendmentEntry {
  date: Date;
  description: string;
  notificationNumber?: string;
}

export interface StatuteResult {
  actName: string;
  section: string;
  title?: string;
  snippet: string;
  sourceUrl: string;
  isOfficial: boolean;
}

export interface CaseLawQuery {
  facts?: string;
  legalIssues?: string[];
  statutes?: string[];
  court?: string;
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string;
  limit?: number;
}

export interface CaseLawResult {
  caseTitle: string;
  citation?: string;
  court: string;
  bench?: string;
  judgmentDate?: Date;
  holding: string;
  relevantParas?: string[];
  sourceUrl: string;
  connectorId: string;
  isOfficial: boolean;
}

export interface JudgmentResult extends CaseLawResult {
  fullText: string;
  headnotes?: string;
}

/** Every legal source connector must implement this interface. */
export interface LegalSourceConnector {
  readonly id: string;
  readonly name: string;
  readonly type: "statute" | "caselaw" | "gazette" | "tribunal" | "secondary";
  readonly isOfficial: boolean;
  readonly requiresLicense: boolean;

  isAvailable(): Promise<boolean>;

  // Statute operations
  searchStatutes(query: StatuteQuery): Promise<StatuteResult[]>;
  getSection(actName: string, section: string, asOf?: Date): Promise<SectionResult | null>;

  // Case-law operations
  searchCaseLaw(query: CaseLawQuery): Promise<CaseLawResult[]>;
  getJudgment(citation: string): Promise<JudgmentResult | null>;
}
