import React, { useState } from "react";
import { aiChat, aiGenerateInvoice, aiWhoOwesMe, aiTaxAdvice } from "@/lib/invoicesmart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SmartOpsPanel() {
  return (
    <div className="grid gap-4">
      <Tabs defaultValue="scan">
        <TabsList className="mb-2">
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="tenders">Tenders</TabsTrigger>
          <TabsTrigger value="quote">Quote</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="scan"><ScanTab /></TabsContent>
        <TabsContent value="tenders"><TenderSearchTab /></TabsContent>
        <TabsContent value="quote"><QuoteTab /></TabsContent>
        <TabsContent value="tax"><TaxTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ScanTab() {
  const [companyId, setCompanyId] = useState(() => { try { return (JSON.parse(localStorage.getItem("as-settings")||"{}")?.companyId) || ""; } catch { return ""; } }); // TODO: replace with real company selection after onboarding
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runScan() {
    if (!companyId) return alert("Enter company ID (temporary)");
    setLoading(true);
    setResult(null);
    try {
      const { reply } = await aiChat(
        `Run an operational health scan for company ID ${companyId}. Identify cash-flow, VAT/CIS, and client concentration risks for a UK construction business.`
      );
      setResult({ summary: reply });
    } catch (e) {
      console.error(e);
      setResult({ error: "Failed to run SmartOps scan" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid md:grid-cols-3 gap-2">
        <input className="input" placeholder="Company ID (temporary)" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        <button className="button" onClick={runScan} disabled={loading}>{loading ? "Scanning…" : "Run Scan"}</button>
      </div>
      {result && (
        <div className="bg-gray-900 rounded-md p-3 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function TenderSearchTab() {
  const [query, setQuery] = useState("construction");
  const [country, setCountry] = useState(() => { try { return (JSON.parse(localStorage.getItem("as-settings")||"{}")?.country) || "UK"; } catch { return "UK"; } });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [govLoading, setGovLoading] = useState(false);
  const [govResults, setGovResults] = useState<any>(null);

  async function search() {
    setLoading(true);
    setResults(null);
    try {
      const { reply } = await aiChat(
        `Find recent construction tenders matching "${query}" in ${country}. Return a list with title, URL, and deadline if available.`
      );
      setResults({ summary: reply });
    } catch (e) {
      console.error(e);
      setResults({ error: "Failed to search tenders" });
    } finally {
      setLoading(false);
    }
  }

  async function searchGov() {
    setGovLoading(true);
    setGovResults(null);
    try {
      const { reply } = await aiChat(
        `Find UK government construction tenders for "${query}" in ${country}. Return a list with title, URL, and deadline if available.`
      );
      setGovResults({ summary: reply });
    } catch (e) {
      console.error(e);
      setGovResults({ error: "Failed to fetch UK tenders" });
    } finally {
      setGovLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid md:grid-cols-5 gap-2">
        <input className="input md:col-span-2" placeholder="Query" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="input" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        <button className="button" onClick={search} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
        <button className="button-secondary" onClick={searchGov} disabled={govLoading}>{govLoading ? "Fetching…" : "Find UK Tenders (Gov)"}</button>
      </div>
      {results?.results && (
        <ul className="text-sm list-disc pl-5">
          {results.results.map((r: any, i: number) => (
            <li key={i}><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>
          ))}
        </ul>
      )}
      {govResults && (
        <div className="bg-gray-900 rounded-md p-3 text-sm space-y-2">
          {govResults.summary && <div className="whitespace-pre-wrap">{govResults.summary}</div>}
          {Array.isArray(govResults.rawTenders) && (
            <ul className="list-disc pl-5">
              {govResults.rawTenders.map((t: any, i: number) => (
                <li key={i}><a className="underline" href={t.url} target="_blank" rel="noreferrer">{t.title}{t.deadline ? ` — ${t.deadline}` : ""}</a></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function QuoteTab() {
  const [title, setTitle] = useState("Small refurb job");
  const [withMaterials, setWithMaterials] = useState(true);
  const [margin, setMargin] = useState(() => { try { return Number(JSON.parse(localStorage.getItem("as-settings")||"{}")?.targetMargin ?? 20); } catch { return 20; } });
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  async function generate() {
    setLoading(true);
    setQuote(null);
    try {
      const { invoice } = await aiGenerateInvoice(
        `Generate a UK construction quote titled "${title}" with materials ${withMaterials ? "included" : "excluded"} and a target margin of ${margin}%.`
      );
      setQuote(invoice);
    } catch (e) {
      console.error(e);
      setQuote({ error: "Failed to generate quote" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid md:grid-cols-4 gap-2">
        <input className="input md:col-span-2" placeholder="Quote title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input" value={withMaterials ? "yes" : "no"} onChange={(e) => setWithMaterials(e.target.value === "yes")}> 
          <option value="yes">With materials</option>
          <option value="no">Without materials</option>
        </select>
        <input className="input" type="number" min={0} max={90} value={margin} onChange={(e) => setMargin(Number(e.target.value))} placeholder="Margin %" />
      </div>
      <button className="button w-fit" onClick={generate} disabled={loading}>{loading ? "Generating…" : "Generate Quote"}</button>
      {quote && (
        <div className="bg-gray-900 rounded-md p-3 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(quote, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function TaxTab() {
  const [turnover, setTurnover] = useState(75000);
  const [scheme, setScheme] = useState(() => { try { return (JSON.parse(localStorage.getItem("as-settings")||"{}")?.vatScheme) || "standard"; } catch { return "standard"; } });
  const [reverseCharge, setReverseCharge] = useState(() => { try { return !!(JSON.parse(localStorage.getItem("as-settings")||"{}")?.reverseCharge ?? true); } catch { return true; } });
  const [cis, setCis] = useState(() => { try { return !!(JSON.parse(localStorage.getItem("as-settings")||"{}")?.cis ?? true); } catch { return true; } });
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string>("");

  async function getAdvice() {
    setLoading(true);
    setAdvice("");
    try {
      const res = await aiTaxAdvice();
      setAdvice(
        (res?.tips as string[])?.join("\n") ||
        (res?.summary as string) ||
        JSON.stringify(res, null, 2)
      );
    } catch (e) {
      console.error(e);
      setAdvice("Failed to get tax advice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid md:grid-cols-5 gap-2">
        <input className="input" type="number" step="1000" placeholder="12m turnover (£)" value={turnover} onChange={(e) => setTurnover(Number(e.target.value))} />
        <select className="input" value={scheme} onChange={(e) => setScheme(e.target.value)}>
          <option value="standard">Standard</option>
          <option value="flat-rate">Flat-rate</option>
          <option value="cash-accounting">Cash accounting</option>
        </select>
        <select className="input" value={reverseCharge ? "yes" : "no"} onChange={(e) => setReverseCharge(e.target.value === "yes")}> 
          <option value="yes">Reverse charge on</option>
          <option value="no">Reverse charge off</option>
        </select>
        <select className="input" value={cis ? "yes" : "no"} onChange={(e) => setCis(e.target.value === "yes")}> 
          <option value="yes">CIS on</option>
          <option value="no">CIS off</option>
        </select>
        <button className="button" onClick={getAdvice} disabled={loading}>{loading ? "Thinking…" : "Get Advice"}</button>
      </div>
      {advice && (
        <div className="bg-gray-900 rounded-md p-3 text-sm whitespace-pre-wrap">{advice}</div>
      )}
    </div>
  );
}
