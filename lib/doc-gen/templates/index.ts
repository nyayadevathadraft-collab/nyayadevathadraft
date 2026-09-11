interface CourtTemplateContext {
  court: string;
  state: string;
  district: string;
  caseType: string;
  side: string;
  documentType: string;
  clientName: string;
  matterTitle: string;
}

interface CourtTemplate {
  format: string;
  heading: (ctx: CourtTemplateContext) => string;
  instructions: string;
}

export const COURT_TEMPLATES: Record<string, CourtTemplate> = {
  "Supreme Court of India": {
    format: "Supreme Court format (Order XIII SCI Rules 2013)",
    heading: (ctx) =>
      `IN THE SUPREME COURT OF INDIA\n(${ctx.caseType.toUpperCase()} JURISDICTION)\n\nIN THE MATTER OF:\n${ctx.clientName} ... ${ctx.side.toUpperCase()}\n\nVERSUS\n\n[Opposing Party] ... [OPPOSITE PARTY]\n\n[PETITION/APPLICATION TYPE] NO. ___ OF ${new Date().getFullYear()}`,
    instructions: `Use Supreme Court of India format:
- Court heading as shown
- Cause title with ellipsis (...)
- Synopsis and List of Dates mandatory
- Grounds numbered and lettered (A, B, C / i, ii, iii)
- Prayer with specific reliefs, numbered
- Verification on solemn affirmation
- Index of documents as first page
- Paper size A4, margins as per SCI Rules`,
  },

  "High Court": {
    format: "High Court format (relevant High Court Rules)",
    heading: (ctx) =>
      `IN THE HIGH COURT OF ${ctx.state.toUpperCase()}\nAT [SEAT]\n\n[WRIT PETITION / CRIMINAL REVISION / CIVIL APPEAL] NO. ___ OF ${new Date().getFullYear()}\n\nIN THE MATTER OF:\n${ctx.clientName} ... ${ctx.side.toUpperCase()}\n\nVERSUS\n\n[Opposing Party] ... RESPONDENT`,
    instructions: `Use High Court format:
- Court heading with seat
- Cause title
- Facts and grounds in numbered paragraphs
- Prayer clause
- Verification / affidavit as required
- Follow ${`the relevant High Court Rules`}`,
  },

  "District and Sessions Court": {
    format: "Sessions Court format",
    heading: (ctx) =>
      `IN THE COURT OF THE SESSIONS JUDGE / ADDITIONAL SESSIONS JUDGE\n${ctx.district.toUpperCase()}, ${ctx.state.toUpperCase()}\n\n[Sessions Case / Criminal Appeal] No. ___ of ${new Date().getFullYear()}\n\nState vs. ${ctx.clientName}`,
    instructions: `Use Sessions Court format:
- Court designation and district/state
- Case number
- Parties
- Numbered grounds
- Specific reliefs in prayer
- Verification`,
  },

  "Chief Judicial Magistrate Court": {
    format: "Magistrate Court format",
    heading: (ctx) =>
      `IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE\n${ctx.district.toUpperCase()}, ${ctx.state.toUpperCase()}\n\n[Criminal Misc. Application / Complaint Case] No. ___ of ${new Date().getFullYear()}\n\nIn the matter of:\n${ctx.clientName} ... ${ctx.side.toUpperCase()}`,
    instructions: `Use Magistrate Court format:
- Court designation and district
- Application/case number
- Parties
- Factual background
- Grounds for relief
- Prayer
- Verification`,
  },

  "Family Court": {
    format: "Family Court format",
    heading: (ctx) =>
      `IN THE FAMILY COURT\n${ctx.district.toUpperCase()}, ${ctx.state.toUpperCase()}\n\n[Petition] No. ___ of ${new Date().getFullYear()}\n\nIn the matter of:\n${ctx.clientName} ... Petitioner\n\nVersus\n\n[Respondent] ... Respondent`,
    instructions: `Use Family Court format:
- Maintain strict privacy — use initials for minor children
- Factual background with dates
- Grounds
- Prayer
- Verification
- Annexure list`,
  },

  "Consumer Commission (District)": {
    format: "Consumer Commission format (Consumer Protection Act 2019)",
    heading: (ctx) =>
      `BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION\n${ctx.district.toUpperCase()}, ${ctx.state.toUpperCase()}\n\nConsumer Complaint No. ___ of ${new Date().getFullYear()}\n\nIn the matter of:\n${ctx.clientName} ... Complainant\n\nVersus\n\n[Opposite Party] ... Opposite Party`,
    instructions: `Use Consumer Commission format (Consumer Protection Act 2019):
- Jurisdiction statement under CPA 2019
- Averments of deficiency in service / unfair trade practice
- Particulars of goods/service and transaction
- Relief under Section 39 CPA 2019
- Verification`,
  },

  default: {
    format: "Standard Indian court format",
    heading: (ctx) =>
      `IN THE COURT OF [COURT NAME]\n${ctx.district?.toUpperCase() ?? ""}, ${ctx.state?.toUpperCase() ?? ""}\n\n[Case] No. ___ of ${new Date().getFullYear()}\n\n${ctx.clientName} ... ${ctx.side?.toUpperCase() ?? "PETITIONER"}\n\nVersus\n\n[Opposing Party] ... RESPONDENT`,
    instructions: `Use standard Indian court format:
- Court heading
- Cause title
- Numbered paragraphs for facts and grounds
- Prayer
- Verification`,
  },
};
