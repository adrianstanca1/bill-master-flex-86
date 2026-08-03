import React, { useState } from "react";
import { aiChat } from "@/lib/invoicesmart";
import { useToast } from "@/components/ui/use-toast";

export default function TenderBot() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"crawl" | "scrape">("crawl");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  async function handleRun() {
    if (!url) return;
    // Basic https URL validation
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") {
        toast({ title: "Use a secure URL", description: "Only https URLs are allowed.", variant: "destructive" });
        return;
      }
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid website URL.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { reply } = await aiChat(
        `TenderBot: ${mode} the page at ${url} and extract construction tender opportunities. Return a JSON-like list with title, url, and deadline.`
      );
      setResult({ summary: reply });
      toast({ title: "TenderBot finished", description: "Results loaded below." });
    } catch (e) {
      console.error(e);
      setResult({ error: "Failed to run TenderBot" });
      const message = e instanceof Error ? e.message : "Could not complete the request.";
      toast({ title: "TenderBot failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid md:grid-cols-5 gap-2">
        <input
          className="input md:col-span-3"
          type="url"
          inputMode="url"
          placeholder="https://example.com/tenders"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value as "crawl" | "scrape")}>
          <option value="crawl">Crawl (site-wide)</option>
          <option value="scrape">Scrape (single page)</option>
        </select>
        <button className="button" onClick={handleRun} disabled={loading} aria-busy={loading} aria-live="polite">
          {loading ? "Running…" : "Run TenderBot"}
        </button>
      </div>

      {result && (
        <div className="bg-gray-900 rounded-md p-3 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
