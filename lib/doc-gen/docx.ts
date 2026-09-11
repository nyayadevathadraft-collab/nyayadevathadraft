import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  Packer,
  BorderStyle,
  Footer,
  PageNumber,
} from "docx";

interface DraftSection {
  id: string;
  type: "heading" | "paragraph" | "prayer" | "verification" | "annexure" | "placeholder";
  content: string;
  citations: string[];
}

interface DraftForExport {
  documentType: string;
  version: number;
  content: {
    courtHeading: string;
    causeTitle: string;
    documentTitle: string;
    sections: DraftSection[];
  };
  matter: {
    title: string;
    court: string;
    state: string;
  };
}

const DISCLAIMER =
  "AI-GENERATED DRAFT — Verify all facts, law, limitation, jurisdiction, court rules and citations with a qualified Indian advocate before filing. This document is not legal advice.";

export async function generateDocx(draft: DraftForExport): Promise<Buffer> {
  const { content } = draft;

  const paragraphs: Paragraph[] = [];

  // Disclaimer banner
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: DISCLAIMER, bold: true, color: "CC0000", size: 18 })],
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CC0000" },
        top: { style: BorderStyle.SINGLE, size: 1, color: "CC0000" },
      },
      spacing: { after: 400 },
    })
  );

  // Court heading
  for (const line of content.courtHeading.split("\n")) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line, bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  paragraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // Document sections
  for (const section of content.sections) {
    switch (section.type) {
      case "heading":
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: section.content, bold: true, size: 24, allCaps: true })],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          })
        );
        break;

      case "prayer":
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "PRAYER", bold: true, size: 24, allCaps: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: section.content, size: 22 })],
            spacing: { after: 160 },
          })
        );
        break;

      case "verification":
        paragraphs.push(
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "VERIFICATION", bold: true, size: 22, allCaps: true })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: section.content, size: 22 })],
            spacing: { after: 160 },
          })
        );
        break;

      case "placeholder":
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content,
                color: "FF8C00",
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 160 },
          })
        );
        break;

      default:
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: section.content, size: 22 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160 },
          })
        );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1.25),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.5),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${content.documentTitle} | ${draft.matter.title} | Page `, size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                  new TextRun({ text: " of ", size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
