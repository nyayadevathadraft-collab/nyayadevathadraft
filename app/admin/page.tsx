import { Sidebar } from "@/components/layout/sidebar";
import { Settings, Database, Plug } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Console</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Plug, title: "Legal Source Connectors", desc: "Manage India Code API and add future connectors (SCC, Manupatra, eCourts)." },
            { icon: Database, title: "Court Templates", desc: "Add or update court-specific templates and filing requirements." },
            { icon: Settings, title: "Data Retention", desc: "Configure matter retention and deletion policies." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl p-5">
              <Icon className="w-6 h-6 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
              <button className="mt-4 text-xs text-blue-700 font-medium hover:underline">
                Configure →
              </button>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          <strong>Connectors currently enabled:</strong> India Code API (official, free).
          To add SCC Online, Manupatra, or eCourts, implement the <code>LegalSourceConnector</code> interface
          in <code>lib/connectors/</code> and add it to the registry.
        </div>
      </main>
    </div>
  );
}
