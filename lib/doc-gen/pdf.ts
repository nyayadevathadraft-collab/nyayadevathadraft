interface DraftSection {
  id: string;
  type: "heading" | "paragraph" | "prayer" | "verification" | "annexure" | "placeholder";
  content: string;
}

interface DraftForExport {
  documentType: string;
  version: number;
  content: {
    courtHeading: string;
    documentTitle: string;
    sections: DraftSection[];
  };
  matter: { title: string; court: string };
}

const DISCLAIMER =
  "AI-GENERATED DRAFT — Verify all facts, law, limitation, jurisdiction, court rules and citations with a qualified Indian advocate before filing.";

function buildHtml(draft: DraftForExport): string {
  const { content } = draft;

  const sectionsHtml = content.sections
    .map((s) => {
      switch (s.type) {
        case "heading":
          return `<h2 class="section-heading">${escHtml(s.content)}</h2>`;
        case "prayer":
          return `<h2 class="section-heading">PRAYER</h2><p>${escHtml(s.content)}</p>`;
        case "verification":
          return `<div class="verification"><h3>VERIFICATION</h3><p>${escHtml(s.content)}</p></div>`;
        case "placeholder":
          return `<p class="placeholder">${escHtml(s.content)}</p>`;
        default:
          return `<p>${escHtml(s.content)}</p>`;
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 25mm 32mm 25mm 38mm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.6; color: #000; }
  .disclaimer { background: #fff3cd; border: 1px solid #cc0000; padding: 8px; font-size: 10pt; color: #cc0000; font-weight: bold; text-align: center; margin-bottom: 20px; }
  .court-heading { text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 4px; }
  h2.section-heading { font-size: 12pt; text-align: center; text-transform: uppercase; font-weight: bold; margin-top: 24px; margin-bottom: 12px; }
  p { text-align: justify; margin-bottom: 8px; }
  .placeholder { color: #e65100; font-weight: bold; }
  .verification { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 12px; }
  .verification h3 { font-size: 11pt; text-transform: uppercase; }
  .footer { position: fixed; bottom: 10mm; width: 100%; text-align: center; font-size: 9pt; color: #666; }
</style>
</head>
<body>
  <div class="disclaimer">${DISCLAIMER}</div>
  ${content.courtHeading.split("\n").map((l) => `<div class="court-heading">${escHtml(l)}</div>`).join("")}
  <br>
  ${sectionsHtml}
  <div class="footer">${escHtml(content.documentTitle)} | ${escHtml(draft.matter.title)}</div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generatePdf(draft: DraftForExport): Promise<Buffer> {
  // Use @sparticuz/chromium for serverless-compatible PDF generation
  let browser;
  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");

    browser = await puppeteer.default.launch({
      args: (chromium.default as { args: string[] }).args,
      executablePath: await (chromium.default as { executablePath: () => Promise<string> }).executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(buildHtml(draft), { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "25mm", right: "32mm", bottom: "25mm", left: "38mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser?.close();
  }
}
