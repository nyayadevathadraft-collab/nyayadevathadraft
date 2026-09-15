import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { FactTimeline, type FactStatus } from "@/components/facts/fact-timeline";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, HelpCircle, User } from "lucide-react";

const STATUS_CONFIG = {
  confirmed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Confirmed" },
  assumption: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Assumption" },
  gap: { icon: HelpCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Missing" },
  user_provided: { icon: User, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "User Provided" },
};

export default async function FactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) redirect("/sign-in");

  const facts = await prisma.fact.findMany({
    where: { matterId, tenantId: dbUser.tenantId },
    orderBy: { createdAt: "asc" },
  });

  const grouped = {
    confirmed: facts.filter((f) => f.status === "confirmed"),
    assumption: facts.filter((f) => f.status === "assumption"),
    gap: facts.filter((f) => f.status === "gap"),
    user_provided: facts.filter((f) => f.status === "user_provided"),
  };

  const chronologyFacts = facts.filter((f) => f.category === "chronology");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="facts" />
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Extracted Facts</h1>
          <p className="text-sm text-gray-500 mb-6">
            {facts.length} facts extracted. Review assumptions and fill in gaps before generating the draft.
          </p>

          {chronologyFacts.length > 0 && (
            <div className="mb-8 border rounded-lg px-4 pt-4 pb-2 bg-white">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Chronology</h2>
              <p className="text-xs text-gray-400 mb-2">
                Ordered by extraction sequence — hover a point for details.
              </p>
              <FactTimeline
                facts={chronologyFacts.map((f) => ({
                  id: f.id,
                  text: f.text,
                  status: f.status as FactStatus,
                  confidence: f.confidence,
                  sourcePage: f.sourcePage,
                }))}
              />
            </div>
          )}

          {facts.length === 0 ? (
            <div className="text-sm text-gray-500 py-8">No facts extracted yet. Run AI analysis first.</div>
          ) : (
            Object.entries(grouped).map(([status, items]) => {
              if (items.length === 0) return null;
              const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              const Icon = cfg.icon;
              return (
                <div key={status} className="mb-6">
                  <div className={cn("flex items-center gap-2 mb-3")}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                    <h2 className="text-sm font-semibold text-gray-700">{cfg.label} ({items.length})</h2>
                  </div>
                  <div className="space-y-2">
                    {items.map((fact) => (
                      <div key={fact.id} className={cn("border rounded-lg px-4 py-3", cfg.bg)}>
                        <p className="text-sm text-gray-900">{fact.text}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="capitalize">{fact.category}</span>
                          {fact.sourcePage && <span>Page {fact.sourcePage}</span>}
                          <span>Confidence: {Math.round(fact.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
