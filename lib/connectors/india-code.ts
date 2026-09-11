import axios from "axios";
import type {
  LegalSourceConnector,
  StatuteQuery,
  StatuteResult,
  SectionResult,
  CaseLawQuery,
  CaseLawResult,
  JudgmentResult,
} from "./base";

const BASE_URL = "https://api.indiacode.nic.in/handle";
const SEARCH_URL = "https://api.indiacode.nic.in/handle";

/**
 * India Code API connector — official Government of India statute repository.
 * Endpoint docs: https://www.indiacode.nic.in/
 *
 * NOTE: India Code does not provide case-law. Only statute operations are implemented.
 * Case-law methods return empty arrays; future connectors (eCourts, SCC) will fill this.
 */
export class IndiaCodeConnector implements LegalSourceConnector {
  readonly id = "india-code";
  readonly name = "India Code (Ministry of Law & Justice)";
  readonly type = "statute" as const;
  readonly isOfficial = true;
  readonly requiresLicense = false;

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get("https://api.indiacode.nic.in/handle", {
        timeout: 5000,
        validateStatus: (s) => s < 500,
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }

  async searchStatutes(query: StatuteQuery): Promise<StatuteResult[]> {
    try {
      const params: Record<string, string> = {};
      if (query.actName) params["title"] = query.actName;
      if (query.keywords) params["keyword"] = query.keywords;

      const response = await axios.get(`${SEARCH_URL}/central`, {
        params: { ...params, language: "English", pageSize: "10", pageNo: "1" },
        timeout: 10000,
      });

      const acts: StatuteResult[] = [];
      const data = response.data;

      if (data && Array.isArray(data.centralActs)) {
        for (const act of data.centralActs.slice(0, 10)) {
          acts.push({
            actName: act.title ?? act.actTitle ?? "Unknown Act",
            section: query.section ?? "",
            title: act.title ?? act.actTitle,
            snippet: act.shortTitle ?? act.subject ?? "",
            sourceUrl: `https://www.indiacode.nic.in/handle/${act.handle ?? ""}`,
            isOfficial: true,
          });
        }
      }

      return acts;
    } catch (err) {
      console.error("[IndiaCode] searchStatutes error:", err);
      return [];
    }
  }

  async getSection(actName: string, section: string, asOf?: Date): Promise<SectionResult | null> {
    try {
      // India Code section fetch — search by act title, then retrieve section text
      const searchResp = await axios.get(`${BASE_URL}/central`, {
        params: { title: actName, language: "English", pageSize: "5", pageNo: "1" },
        timeout: 10000,
      });

      const acts = searchResp.data?.centralActs;
      if (!acts || acts.length === 0) return null;

      const handle = acts[0]?.handle;
      if (!handle) return null;

      // Fetch section list for this act
      const sectionResp = await axios.get(`${BASE_URL}/${handle}/sections`, {
        params: { section },
        timeout: 10000,
      });

      const sectionData = sectionResp.data;
      if (!sectionData) return null;

      return {
        actName,
        section,
        text: sectionData.sectionContent ?? sectionData.content ?? "[Section text unavailable — please verify on indiacode.nic.in]",
        title: sectionData.sectionTitle ?? sectionData.title,
        commencementDate: sectionData.commencementDate ? new Date(sectionData.commencementDate) : undefined,
        sourceUrl: `https://www.indiacode.nic.in/handle/${handle}`,
        retrievedAt: new Date(),
        isOfficial: true,
        connectorId: this.id,
      };
    } catch (err) {
      console.error("[IndiaCode] getSection error:", err);
      return null;
    }
  }

  // India Code does not serve case-law. These return empty for now.
  async searchCaseLaw(_query: CaseLawQuery): Promise<CaseLawResult[]> {
    return [];
  }

  async getJudgment(_citation: string): Promise<JudgmentResult | null> {
    return null;
  }
}
