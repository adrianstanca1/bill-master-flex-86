import React, { useState } from "react";
import { aiChat, aiGenerateInvoice, aiWhoOwesMe, aiTaxAdvice, aiSummarizePL, getSettings } from "@/lib/invoicesmart";

 type Result = { name: string; status: "OK" | "FAIL" | "SKIP"; detail?: string };

export default function FunctionDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  async function run() {
    setLoading(true);
    setResults(null);
    const localSettings = (() => { try { return JSON.parse(localStorage.getItem("as-settings") || "{}") as Record<string, unknown>; } catch { return {}; } })();
    let settings: Record<string, unknown> = {};
    try {
      settings = (await getSettings()) as Record<string, unknown>;
    } catch {
      settings = {};
    }
    const companyId = typeof settings.companyId === "string" ? settings.companyId : String(localSettings?.companyId || "");

    async function call(name: string, fn: () => Promise<Record<string, unknown> | { reply: string }>): Promise<Result> {
      try {
        const data = await fn();
        return { name, status: "OK", detail: JSON.stringify(data).slice(0, 180) };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { name, status: "FAIL", detail: message || "error" };
      }
    }

    const tasks: Promise<Result>[] = [
      call("aiChat", () => aiChat("Health check")),
      call("aiGenerateInvoice", () => aiGenerateInvoice("Small kitchen refurb for a domestic client")),
      call("aiTaxAdvice", () => aiTaxAdvice()),
      call("aiWhoOwesMe", () => aiWhoOwesMe()),
      call("aiSummarizePL", () => aiSummarizePL()),
      call("rams", () => aiChat("Generate a brief RAMS for a kitchen refurb project in London.")),
      call("tenderbot", () => aiChat("Extract tender opportunities from https://example.com/tenders for UK construction.")),
      companyId ? call("smartops", () => aiChat(`Run a SmartOps scan for company ${companyId}.`)) : Promise.resolve({ name: "smartops", status: "SKIP", detail: "No companyId in Settings" }),
    ];

    const res = await Promise.all(tasks);
    setResults(res);
    setLoading(false);
  }

  function getSuggestion(name: string, detail?: string) {
    const d = (detail || '').toLowerCase();
    if (d.includes("incorrect api key") || d.includes("openai") || d.includes("provider") || d.includes("model")) {
      return "Set a valid AI provider/key in InvoiceSmart settings and try again.";
    }
    if (d.includes("jwt") || d.includes("401")) {
      return "Please sign in and re-run.";
    }
    if (name === "smartops" && d.includes("no companyid")) {
      return "Add your Company ID in Settings and re-run.";
    }
    return "Check InvoiceSmart API logs for details.";
  }

  return (
    <div className="grid gap-2">
      <button className="button w-fit" onClick={run} disabled={loading}>
        {loading ? "Running diagnostics…" : "Run Diagnostics"}
      </button>
      {results && (
        <div className="bg-gray-900 rounded-md p-3 overflow-auto">
          <table className="table text-sm">
            <thead>
              <tr><th>Function</th><th>Status</th><th>Detail</th><th>Solution</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td className={r.status === "OK" ? "text-emerald-400" : r.status === "SKIP" ? "text-gray-400" : "text-red-400"}>{r.status}</td>
                  <td className="break-all">{r.detail}</td>
                  <td className="text-text-secondary">{getSuggestion(r.name, r.detail)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
