export type UserRole = "advocate" | "admin" | "viewer";
export type MatterStatus = "created" | "uploading" | "processing" | "awaiting_selection" | "drafting" | "review" | "exported";
export type FactStatus = "confirmed" | "assumption" | "gap" | "user_provided";
export type AuthorityTreatment = "binding" | "persuasive" | "overruled" | "analogous";
export type AuthoritySelection = "pending" | "included" | "excluded" | "research_only";
export type DraftStatus = "generating" | "review" | "approved" | "exported";
export type CitationVerification = "verified" | "unverified" | "blocked";

export interface MatterWizardData {
  title: string;
  clientName: string;
  court: string;
  state: string;
  district: string;
  caseType: string;
  side: string;
  documentType: string;
}

export interface ExtractedEntity {
  type: "person" | "date" | "place" | "case_number" | "fir_number" | "section" | "act" | "court" | "police_station" | "prayer";
  value: string;
  page?: number;
  confidence: number;
}

export interface ReviewFlag {
  type: "unverified_citation" | "missing_verification" | "date_conflict" | "incorrect_heading" | "potential_limitation" | "missing_prayer" | "incomplete_annexure" | "sensitive_data";
  message: string;
  severity: "error" | "warning" | "info";
  location?: string;
}

export interface PipelineStageInfo {
  stage: number;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  { stage: 0, label: "Waiting", status: "pending" },
  { stage: 1, label: "OCR & Extraction", status: "pending" },
  { stage: 2, label: "Fact Analysis", status: "pending" },
  { stage: 3, label: "Issue Identification", status: "pending" },
  { stage: 4, label: "Statute Retrieval", status: "pending" },
  { stage: 5, label: "Case-law Research", status: "pending" },
  { stage: 6, label: "Authority Selection", status: "pending" },
  { stage: 7, label: "Draft Generation", status: "pending" },
  { stage: 8, label: "Validation", status: "pending" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

export const COURTS = [
  "Supreme Court of India",
  "High Court",
  "District and Sessions Court",
  "Civil Judge Court",
  "Chief Judicial Magistrate Court",
  "Judicial Magistrate First Class Court",
  "Additional Chief Judicial Magistrate Court",
  "Metropolitan Magistrate Court",
  "Chief Metropolitan Magistrate Court",
  "Family Court",
  "Consumer Commission (District)",
  "Consumer Commission (State)",
  "National Consumer Disputes Redressal Commission",
  "National Company Law Tribunal",
  "National Company Law Appellate Tribunal",
  "Debt Recovery Tribunal",
  "Central Administrative Tribunal",
];

export const CASE_TYPES = [
  "Criminal", "Civil", "Constitutional", "Family",
  "Commercial", "Consumer", "Insolvency", "Tribunal", "Other",
];

export const SIDES = [
  "Petitioner", "Applicant", "Complainant", "Plaintiff",
  "Appellant", "Respondent", "Accused", "Defendant",
];

export const DOCUMENT_TYPES = [
  { value: "legal_notice", label: "Legal Notice" },
  { value: "reply_to_legal_notice", label: "Reply to Legal Notice" },
  { value: "criminal_complaint", label: "Criminal Complaint" },
  { value: "bail_application", label: "Bail Application" },
  { value: "anticipatory_bail", label: "Anticipatory Bail Application" },
  { value: "regular_bail", label: "Regular Bail Application" },
  { value: "default_bail", label: "Default Bail Application" },
  { value: "quashing_petition", label: "Quashing Petition" },
  { value: "writ_petition", label: "Writ Petition" },
  { value: "civil_plaint", label: "Civil Plaint" },
  { value: "written_statement", label: "Written Statement" },
  { value: "interim_relief_application", label: "Application for Interim Relief" },
  { value: "injunction_application", label: "Injunction Application" },
  { value: "appeal", label: "Appeal" },
  { value: "revision", label: "Criminal/Civil Revision" },
  { value: "discharge_application", label: "Discharge Application" },
  { value: "affidavit", label: "Affidavit" },
  { value: "written_submissions", label: "Written Submissions" },
  { value: "case_synopsis", label: "Case Synopsis" },
  { value: "list_of_dates", label: "List of Dates" },
  { value: "legal_research_note", label: "Legal Research Note" },
  { value: "vakalatnama", label: "Vakalatnama" },
];
