"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import {
  INDIAN_STATES,
  COURTS,
  CASE_TYPES,
  SIDES,
  DOCUMENT_TYPES,
} from "@/types";
import { ChevronRight } from "lucide-react";

const STEPS = ["Basic Info", "Court & Jurisdiction", "Document Type"];

export default function NewMatterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    court: "",
    state: "",
    district: "",
    caseType: "",
    side: "",
    documentType: "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create matter");
      const { matter } = await res.json();
      toast.success("Matter created!");
      router.push(`/matters/${matter.id}/upload`);
    } catch {
      toast.error("Could not create matter. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isStep0Valid = form.title.length >= 3 && form.clientName.length >= 2;
  const isStep1Valid = form.court && form.state && form.district && form.caseType && form.side;
  const isStep2Valid = !!form.documentType;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Matter</h1>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? "bg-blue-900 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-sm ${i === step ? "font-medium text-gray-900" : "text-gray-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matter Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Sharma v. State — Bail Application"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Client's full name"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court *</label>
                <select value={form.court} onChange={(e) => set("court", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select court</option>
                  {COURTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <select value={form.state} onChange={(e) => set("state", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                  <input type="text" value={form.district} onChange={(e) => set("district", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Mumbai City" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Type *</label>
                  <select value={form.caseType} onChange={(e) => set("caseType", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select type</option>
                    {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Client's Side *</label>
                  <select value={form.side} onChange={(e) => set("side", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select side</option>
                    {SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document to Draft *</label>
              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                {DOCUMENT_TYPES.map((dt) => (
                  <label key={dt.value} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${form.documentType === dt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="documentType" value={dt.value} checked={form.documentType === dt.value} onChange={(e) => set("documentType", e.target.value)} className="text-blue-600" />
                    <span className="text-sm text-gray-800">{dt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && !isStep0Valid) || (step === 1 && !isStep1Valid)}
                className="px-5 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isStep2Valid || loading}
                className="px-5 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
              >
                {loading ? "Creating…" : "Create Matter"}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
