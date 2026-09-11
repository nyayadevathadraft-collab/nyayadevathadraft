import type { LegalSourceConnector } from "./base";
import { IndiaCodeConnector } from "./india-code";

// ── Placeholder stubs for future connectors ────────────────────────────────
// To add a new connector:
// 1. Create a file implementing LegalSourceConnector (e.g. ecourts.ts)
// 2. Import it here
// 3. Add it to AVAILABLE_CONNECTORS
// 4. Set the env var ENABLED_CONNECTORS=india-code,ecourts (comma-separated)
// ──────────────────────────────────────────────────────────────────────────

// import { ECourtsConnector } from "./ecourts";          // TODO
// import { SCCOnlineConnector } from "./scc-online";     // TODO
// import { ManupatraConnector } from "./manupatra";      // TODO
// import { DRTConnector } from "./drt";                  // TODO

const AVAILABLE_CONNECTORS: LegalSourceConnector[] = [
  new IndiaCodeConnector(),
  // new ECourtsConnector(),
  // new SCCOnlineConnector(),
  // new ManupatraConnector(),
];

const enabledIds = (process.env.ENABLED_CONNECTORS ?? "india-code")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const connectors: LegalSourceConnector[] = AVAILABLE_CONNECTORS.filter(
  (c) => enabledIds.includes(c.id)
);

export function getConnector(id: string): LegalSourceConnector | undefined {
  return connectors.find((c) => c.id === id);
}

export function getStatuteConnectors(): LegalSourceConnector[] {
  return connectors.filter((c) =>
    ["statute", "gazette"].includes(c.type)
  );
}

export function getCaseLawConnectors(): LegalSourceConnector[] {
  return connectors.filter((c) =>
    ["caselaw", "tribunal"].includes(c.type)
  );
}
