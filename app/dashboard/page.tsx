import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, pipelineStageName } from "@/lib/utils";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  created: { label: "Created", color: "bg-gray-100 text-gray-600", icon: FileText },
  uploading: { label: "Uploading", color: "bg-blue-100 text-blue-700", icon: Clock },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-700", icon: Clock },
  awaiting_selection: { label: "Select Authorities", color: "bg-purple-100 text-purple-700", icon: AlertCircle },
  drafting: { label: "Drafting", color: "bg-blue-100 text-blue-700", icon: Clock },
  review: { label: "Ready for Review", color: "bg-green-100 text-green-700", icon: CheckCircle },
  exported: { label: "Exported", color: "bg-gray-100 text-gray-600", icon: CheckCircle },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    // Auto-provision if missing (first login after signup)
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth`, { method: "POST" });
    redirect("/dashboard");
  }

  const matters = await prisma.matter.findMany({
    where: { tenantId: dbUser.tenantId },
    orderBy: { updatedAt: "desc" },
    include: { documents: { select: { id: true } }, drafts: { select: { id: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matters</h1>
          <p className="text-sm text-gray-500 mt-1">{matters.length} matter{matters.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/matters/new"
          className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Matter
        </Link>
      </div>

      {matters.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No matters yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first matter to start drafting.</p>
          <Link
            href="/matters/new"
            className="inline-flex items-center gap-2 bg-blue-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Matter
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {matters.map((matter) => {
            const statusCfg = STATUS_CONFIG[matter.status] ?? STATUS_CONFIG.created;
            const StatusIcon = statusCfg.icon;

            return (
              <Link
                key={matter.id}
                href={`/matters/${matter.id}/upload`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{matter.title}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {matter.clientName} · {matter.court} · {matter.state}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{matter.documents.length} document{matter.documents.length !== 1 ? "s" : ""}</span>
                      <span>{matter.drafts.length} draft{matter.drafts.length !== 1 ? "s" : ""}</span>
                      <span>Stage {matter.pipelineStage}: {pipelineStageName(matter.pipelineStage)}</span>
                      <span>Updated {formatDate(matter.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {matter.documentType.replace(/_/g, " ")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
