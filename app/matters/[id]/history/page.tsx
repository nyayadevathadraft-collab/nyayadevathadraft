import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { formatDate } from "@/lib/utils";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) redirect("/sign-in");

  const [events, drafts] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { matterId, tenantId: dbUser.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.draft.findMany({
      where: { matterId, tenantId: dbUser.tenantId },
      orderBy: { version: "desc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="history" />
        <div className="mt-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Version History & Audit Log</h1>

          {/* Draft versions */}
          {drafts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Draft Versions</h2>
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div key={d.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Version {d.version}</span>
                      <span className="ml-2 text-xs text-gray-500">{d.status}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Audit Log</h2>
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 font-mono">{event.action}</span>
                  <span className="text-xs text-gray-400">{formatDate(event.createdAt)}</span>
                </div>
                {event.payload && (
                  <pre className="text-xs text-gray-500 mt-1 overflow-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No audit events yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
