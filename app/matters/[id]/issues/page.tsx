import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { AlertTriangle, Scale } from "lucide-react";

export default async function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) redirect("/sign-in");

  const [issues, statutes] = await Promise.all([
    prisma.legalIssue.findMany({ where: { matterId, tenantId: dbUser.tenantId } }),
    prisma.matterStatute.findMany({
      where: { matterId },
      include: { statuteRef: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="issues" />
        <div className="mt-6 max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Legal Issues & Statutes</h1>

          {issues.length === 0 ? (
            <div className="text-sm text-gray-500 py-8">No issues identified yet. Run AI analysis first.</div>
          ) : (
            <>
              <div className="mb-8 space-y-4">
                {issues.map((issue) => (
                  <div key={issue.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Scale className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                        {issue.proceduralStage && (
                          <p className="text-xs text-gray-500 mt-1">Stage: {issue.proceduralStage}</p>
                        )}
                        {issue.transitionFlag && (
                          <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-amber-800">BNS/BNSS/BSA Transition Flag</p>
                              {issue.transitionNote && (
                                <p className="text-xs text-amber-700 mt-0.5">{issue.transitionNote}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {statutes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Applicable Statutes</h2>
                  <div className="space-y-3">
                    {statutes.map(({ statuteRef }) => (
                      <div key={statuteRef.id} className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900 text-sm">
                            Section {statuteRef.section}{statuteRef.subsection ? `(${statuteRef.subsection})` : ""}, {statuteRef.actName}
                          </p>
                          {statuteRef.isOfficial && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Official Source</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed mb-2">{statuteRef.currentText.slice(0, 300)}…</p>
                        <a href={statuteRef.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          View source ({new Date(statuteRef.retrievedAt).toLocaleDateString("en-IN")})
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
