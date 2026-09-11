"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Send } from "lucide-react";

interface PartyRow {
  name: string;
  role: string;
  address: string;
  contact: string;
}

interface ChronologyRow {
  date: string;
  event: string;
}

interface Props {
  matterId: string;
}

type Mode = "freetext" | "structured" | "both";

const EMPTY_PARTY: PartyRow = { name: "", role: "", address: "", contact: "" };
const EMPTY_EVENT: ChronologyRow = { date: "", event: "" };

export function ManualEntryForm({ matterId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("freetext");
  const [submitting, setSubmitting] = useState(false);

  // Free-text state
  const [freeText, setFreeText] = useState("");

  // Structured state
  const [parties, setParties] = useState<PartyRow[]>([{ ...EMPTY_PARTY }]);
  const [chronology, setChronology] = useState<ChronologyRow[]>([{ ...EMPTY_EVENT }]);
  const [firNumber, setFirNumber] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [dateOfIncident, setDateOfIncident] = useState("");
  const [sectionsInvolved, setSectionsInvolved] = useState("");
  const [priorProceedings, setPriorProceedings] = useState("");
  const [reliefSought, setReliefSought] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // Party row helpers
  function updateParty(idx: number, field: keyof PartyRow, value: string) {
    setParties((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }
  function addParty() {
    setParties((prev) => [...prev, { ...EMPTY_PARTY }]);
  }
  function removeParty(idx: number) {
    setParties((prev) => prev.filter((_, i) => i !== idx));
  }

  // Chronology row helpers
  function updateEvent(idx: number, field: keyof ChronologyRow, value: string) {
    setChronology((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function addEvent() {
    setChronology((prev) => [...prev, { ...EMPTY_EVENT }]);
  }
  function removeEvent(idx: number) {
    setChronology((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    // Validate based on mode
    if ((mode === "freetext" || mode === "both") && !freeText.trim()) {
      toast.error("Please enter a description of the matter.");
      return;
    }
    if (mode === "structured" || mode === "both") {
      const hasParty = parties.some((p) => p.name.trim() && p.role.trim());
      const hasEvent = chronology.some((c) => c.event.trim());
      if (!hasParty && !hasEvent && !firNumber && !caseNumber && !reliefSought) {
        toast.error("Please fill in at least some structured details.");
        return;
      }
    }

    const payload: Record<string, unknown> = { mode };

    if (mode === "freetext" || mode === "both") {
      payload.freeText = freeText.trim();
    }

    if (mode === "structured" || mode === "both") {
      payload.structured = {
        parties: parties
          .filter((p) => p.name.trim() && p.role.trim())
          .map((p) => ({
            name: p.name.trim(),
            role: p.role.trim(),
            ...(p.address.trim() && { address: p.address.trim() }),
            ...(p.contact.trim() && { contact: p.contact.trim() }),
          })),
        chronology: chronology
          .filter((c) => c.event.trim())
          .map((c) => ({
            event: c.event.trim(),
            ...(c.date.trim() && { date: c.date.trim() }),
          })),
        ...(firNumber.trim() && { firNumber: firNumber.trim() }),
        ...(caseNumber.trim() && { caseNumber: caseNumber.trim() }),
        ...(policeStation.trim() && { policeStation: policeStation.trim() }),
        ...(dateOfIncident.trim() && { dateOfIncident: dateOfIncident.trim() }),
        ...(sectionsInvolved.trim() && { sectionsInvolved: sectionsInvolved.trim() }),
        ...(priorProceedings.trim() && { priorProceedings: priorProceedings.trim() }),
        ...(reliefSought.trim() && { reliefSought: reliefSought.trim() }),
        ...(additionalContext.trim() && { additionalContext: additionalContext.trim() }),
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/facts/${matterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }
      toast.success("Matter details submitted — AI analysis started");
      router.push(`/matters/${matterId}/authorities`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["freetext", "structured", "both"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {m === "freetext" ? "Free Text" : m === "structured" ? "Structured Form" : "Both"}
          </button>
        ))}
      </div>

      {/* Free text panel */}
      {(mode === "freetext" || mode === "both") && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Describe the Matter
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-gray-500">
            Write in your own words — facts, parties, dates, sections, relief sought. The AI will
            extract and structure this automatically.
          </p>
          <textarea
            rows={10}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. My client Ramesh Kumar was arrested on 15 March 2024 under FIR No. 123/2024 at Koramangala Police Station, Bengaluru for offences under Section 420 BNS and Section 406 BNS. He has been in custody since..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>
      )}

      {/* Structured form panel */}
      {(mode === "structured" || mode === "both") && (
        <div className="space-y-6 border border-gray-200 rounded-xl p-6 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Structured Details</h3>

          {/* Case identifiers */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="FIR Number" value={firNumber} onChange={setFirNumber} placeholder="e.g. 123/2024" />
            <Field label="Case Number" value={caseNumber} onChange={setCaseNumber} placeholder="e.g. CC 456/2024" />
            <Field label="Police Station" value={policeStation} onChange={setPoliceStation} placeholder="e.g. Koramangala PS" />
            <Field
              label="Date of Incident"
              type="date"
              value={dateOfIncident}
              onChange={setDateOfIncident}
              placeholder=""
            />
          </div>

          {/* Parties */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Parties</label>
              <button
                type="button"
                onClick={addParty}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Party
              </button>
            </div>
            <div className="space-y-3">
              {parties.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3">
                    <input
                      value={p.role}
                      onChange={(e) => updateParty(i, "role", e.target.value)}
                      placeholder="Role (e.g. Petitioner)"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      value={p.name}
                      onChange={(e) => updateParty(i, "name", e.target.value)}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      value={p.address}
                      onChange={(e) => updateParty(i, "address", e.target.value)}
                      placeholder="Address (optional)"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    {parties.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParty(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronology */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Chronology of Events</label>
              <button
                type="button"
                onClick={addEvent}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>
            <div className="space-y-2">
              {chronology.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="date"
                    value={c.date}
                    onChange={(e) => updateEvent(i, "date", e.target.value)}
                    className={`${inputCls} w-40 flex-shrink-0`}
                  />
                  <input
                    value={c.event}
                    onChange={(e) => updateEvent(i, "event", e.target.value)}
                    placeholder="Describe what happened"
                    className={`${inputCls} flex-1`}
                  />
                  {chronology.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvent(i)}
                      className="text-gray-400 hover:text-red-500 mt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legal details */}
          <div className="space-y-4">
            <LongField
              label="Sections / Acts Involved"
              value={sectionsInvolved}
              onChange={setSectionsInvolved}
              placeholder="e.g. Section 420 BNS, Section 406 BNS, Section 120B BNS"
              rows={2}
            />
            <LongField
              label="Prior Proceedings"
              value={priorProceedings}
              onChange={setPriorProceedings}
              placeholder="Any earlier petitions, bail applications, orders, or appeals"
              rows={3}
            />
            <LongField
              label="Relief Sought"
              value={reliefSought}
              onChange={setReliefSought}
              placeholder="What order or relief do you want the court to grant?"
              rows={3}
            />
            <LongField
              label="Additional Context"
              value={additionalContext}
              onChange={setAdditionalContext}
              placeholder="Any other facts or circumstances relevant to the matter"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {submitting ? "Submitting…" : "Submit & Start AI Analysis"}
        </button>
        {submitting && (
          <p className="text-xs text-gray-500">
            This may take 1–3 minutes. You will be redirected automatically.
          </p>
        )}
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <strong>Note:</strong> Information you enter is encrypted at rest and in transit. It is
        used only to generate your draft and is never used to train AI models.
      </div>
    </div>
  );
}

// ─── Small shared sub-components ─────────────────────────────────────────────

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function LongField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} resize-y`}
      />
    </div>
  );
}
