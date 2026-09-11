// Seed fictional demo data for NyayaDraft AI
// All facts, parties, and cases are entirely fictional.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data (all fictional)...");

  // Fictional tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Law Chambers",
      plan: "free",
    },
  });

  console.log("Created tenant:", tenant.name);

  // Fictional seed authority (landmark SC case - public domain)
  await prisma.authority.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      caseTitle: "Arnesh Kumar v. State of Bihar",
      citation: "(2014) 8 SCC 273",
      court: "Supreme Court of India",
      bench: "Two-Judge Bench",
      judgmentDate: new Date("2014-07-02"),
      holding:
        "Police officers must be satisfied that the conditions under Section 41 CrPC (now BNSS equivalent) are met before effecting arrest. Magistrates must apply mind before authorising detention.",
      relevantParas: { paras: ["12", "13", "14"] },
      treatment: "binding",
      sourceConnectorId: "demo-seed",
      sourceUrl: "https://main.sci.gov.in/judgment/doc/13091319",
      verified: true,
      retrievedAt: new Date(),
    },
  });

  await prisma.authority.upsert({
    where: { id: "00000000-0000-0000-0000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      caseTitle: "Satender Kumar Antil v. CBI",
      citation: "(2022) 10 SCC 51",
      court: "Supreme Court of India",
      bench: "Two-Judge Bench",
      judgmentDate: new Date("2022-07-11"),
      holding:
        "Default bail under Section 167(2) CrPC (Section 187 BNSS) is an indefeasible right; filing of chargesheet after expiry does not extinguish the right if bail was already applied for.",
      relevantParas: { paras: ["28", "29", "30", "31"] },
      treatment: "binding",
      sourceConnectorId: "demo-seed",
      sourceUrl: "https://main.sci.gov.in/judgment/doc/14087399",
      verified: true,
      retrievedAt: new Date(),
    },
  });

  console.log("Seeded 2 demo authorities.");
  console.log("Done. Note: create a real user via Supabase Auth and link to this tenant.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
