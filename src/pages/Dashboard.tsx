import React, { useEffect, useMemo, useState, useRef } from "react";
import AgentChat from "@/components/AgentChat";
import TenderBot from "@/components/TenderBot";
import RamsGenerator from "@/components/RamsGenerator";
import SmartOpsPanel from "@/components/SmartOpsPanel";
import FunctionDiagnostics from "@/components/FunctionDiagnostics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { listInvoices, listClients, markInvoicePaid, Invoice } from "@/lib/invoicesmart";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import CISCalculator from "@/components/CISCalculator";
type InvoiceRow = {
  id?: string;
  number: string;
  client: string;
  total: number;
  dueDate?: string; // yyyy-mm-dd
  status: "draft" | "sent" | "paid" | "overdue";
};

const LS_KEY = "as-invoices";

function readInvoices(): InvoiceRow[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeInvoices(rows: InvoiceRow[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

function isOverdue(inv: InvoiceRow): boolean {
  if (inv.status === "paid") return false;
  if (!inv.dueDate) return false;
  const today = new Date();
  const due = new Date(inv.dueDate);
  return (
    due.getTime() <
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  );
}

export default function Dashboard() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [newRow, setNewRow] = useState<InvoiceRow>({
    number: "",
    client: "",
    total: 0,
    dueDate: "",
    status: "sent",
  });

  const [filter, setFilter] = useState<string>("");
  const numberInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [invoices, clients] = await Promise.all([listInvoices(), listClients()]);
        if (cancelled) return;
        const clientMap = new Map(clients.map((c) => [c.id, c.name]));
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const serverRows: InvoiceRow[] = invoices.map((inv: Invoice) => {
          let status: InvoiceRow["status"] = "draft";
          if (inv.status === "paid") {
            status = "paid";
          } else if (inv.due_date && new Date(inv.due_date) < todayDate) {
            status = "overdue";
          } else if (inv.status === "sent") {
            status = "sent";
          }
          return {
            id: inv.id,
            number: inv.invoice_number,
            client: clientMap.get(inv.client_id || "") || "Unknown",
            total: Number(inv.total_amount) || 0,
            dueDate: inv.due_date || undefined,
            status,
          };
        });

        const localRows = readInvoices();
        const byNumber = new Map<string, InvoiceRow>();
        for (const r of localRows) byNumber.set(r.number, r);
        for (const r of serverRows) byNumber.set(r.number, r); // server wins

        const merged = Array.from(byNumber.values()).map((r) => ({
          ...r,
          status: (r.status === "paid" ? "paid" : isOverdue(r) ? "overdue" : r.status) as InvoiceRow["status"],
        }));

        setRows(merged);
        writeInvoices(merged);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast?.({
          title: "Load failed",
          description: message || "Could not load invoices from the server.",
          variant: "destructive",
        });
        const localRows = readInvoices().map((r) => ({
          ...r,
          status: (r.status === "paid" ? "paid" : isOverdue(r) ? "overdue" : r.status) as InvoiceRow["status"],
        }));
        setRows(localRows);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const kpi = useMemo(() => {
    const outstanding = rows
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + (r.total || 0), 0);
    const overdueList = rows.filter((r) => r.status === "overdue");
    const overdue = overdueList.reduce((s, r) => s + (r.total || 0), 0);
    const nextDue = rows
      .filter((r) => r.status !== "paid" && r.dueDate)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0];
    return { outstanding, overdue, overdueCount: overdueList.length, nextDue };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.number, r.client, r.status, r.dueDate || "", String(r.total)]
      .some((v) => String(v).toLowerCase().includes(term)));
  }, [rows, filter]);

  function addRow() {
    if (!newRow.number || !newRow.client)
      return alert("Invoice number and client required.");
    const r = { ...newRow, total: Number(newRow.total || 0) };
    const updated = [...rows, r];
    setRows(updated);
    writeInvoices(updated);
    setNewRow({ number: "", client: "", total: 0, dueDate: "", status: "sent" });
  }
  function removeRow(idx: number) {
    const row = filteredRows[idx];
    if (!row) return;
    const targetIdx = rows.findIndex((r) => r.number === row.number);
    if (targetIdx === -1) return;
    const updated = rows.slice(0, targetIdx).concat(rows.slice(targetIdx + 1));
    setRows(updated);
    writeInvoices(updated);
  }
  async function markPaid(idx: number) {
    const row = filteredRows[idx];
    if (!row) return;
    if (row.id) {
      try {
        await markInvoicePaid(row.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not mark invoice as paid on the server.";
        toast?.({
          title: "Update failed",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }
    const targetIdx = rows.findIndex((r) => r.number === row.number);
    if (targetIdx === -1) return;
    const updated: InvoiceRow[] = rows.map((r, i) =>
      i === targetIdx ? { ...r, status: "paid" as InvoiceRow["status"] } : r
    );
    setRows(updated);
    writeInvoices(updated);
  }

  const { toast } = useToast();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderIdx, setReminderIdx] = useState<number | null>(null);
  const [reminderMsg, setReminderMsg] = useState("");
  const [generating, setGenerating] = useState(false);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { month: string; Outstanding: number; Paid: number }> = {};
    for (const r of rows) {
      const d = r.dueDate || "";
      const month = d && d.length >= 7 ? d.slice(0, 7) : "No date";
      if (!byMonth[month]) byMonth[month] = { month, Outstanding: 0, Paid: 0 };
      if (r.status === "paid") byMonth[month].Paid += r.total || 0;
      else byMonth[month].Outstanding += r.total || 0;
    }
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  function exportCSV() {
    const headers = ["number", "client", "total", "dueDate", "status"];
    const lines = [headers.join(",")].concat(
      rows.map((r) =>
        [r.number, r.client, r.total, r.dueDate || "", r.status]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast?.({ title: "Exported", description: "Invoices exported to CSV." });
  }

  function openReminder(i: number) {
    const r = filteredRows[i];
    if (!r) return;
    const daysLate = isOverdue(r) && r.dueDate
      ? Math.max(0, Math.ceil((Date.now() - new Date(r.dueDate).getTime()) / 86400000))
      : 0;
    const draft = `Subject: Invoice ${r.number} – Payment Reminder\n\nHi ${r.client},\n\nI hope you are well. This is a friendly reminder that invoice ${r.number} for £${(r.total || 0).toFixed(2)}${r.dueDate ? ` was due on ${r.dueDate}` : ""}.${daysLate ? ` It is now ${daysLate} day(s) overdue.` : ""}\n\nCould you please confirm when payment will be made? Thank you.\n\nKind regards,\nAccounts Team`;
    setReminderIdx(i);
    setReminderMsg(draft);
    setReminderOpen(true);
  }

async function generateReminder() {
  if (reminderIdx == null) return;
  try {
    setGenerating(true);
    const r = rows[reminderIdx];
    const message = `Draft a concise, polite payment reminder email in British English for the construction trade. Include a subject and email body. Invoice ${r.number}, client ${r.client}, amount £${(r.total || 0).toFixed(2)}, ${r.dueDate ? `due on ${r.dueDate}` : "no due date"}.`;
    const { data, error } = await supabase.functions.invoke("advisor", { body: { message, context: { type: "payment-reminder" } } });
    if (error) throw error as any;
    const reply = (data as any)?.reply || (data as any)?.message || JSON.stringify(data);
    setReminderMsg(reply);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    toast?.({ title: "Generate failed", description: message, variant: "destructive" });
  } finally {
    setGenerating(false);
  }
}

function remindAllOverdue() {
  const overdueList = rows.filter((r) => r.status === "overdue" || isOverdue(r));
  if (!overdueList.length) {
    toast?.({ title: "No overdue invoices", description: "You're all clear!" });
    return;
  }
  const parts = overdueList.map((r) => {
    const daysLate = r.dueDate
      ? Math.max(0, Math.ceil((Date.now() - new Date(r.dueDate).getTime()) / 86400000))
      : 0;
    return `Subject: Invoice ${r.number} – Payment Reminder\n\nHi ${r.client},\n\nThis is a friendly reminder that invoice ${r.number} for £${(r.total || 0).toFixed(2)}${r.dueDate ? ` was due on ${r.dueDate}` : ""}.${daysLate ? ` It is now ${daysLate} day(s) overdue.` : ""}\n\nCould you please confirm when payment will be made? Thank you.\n\nKind regards,\nAccounts Team`;
  });
  setReminderIdx(null);
  setReminderMsg(parts.join("\n\n---\n\n"));
  setReminderOpen(true);
  toast?.({ title: "Drafted reminders", description: `${overdueList.length} overdue invoice(s) ready to copy.` });
}

  const defaultTab = (() => {
    if (typeof window === "undefined") return "overview";
    const h = window.location.hash.replace('#', '');
    const allowed = new Set(["overview", "invoices", "ai", "smartops", "tenders", "rams", "tools", "diag"]);
    return allowed.has(h) ? h : "overview";
  })();

  const [tab, setTab] = useState(defaultTab);

  // Sync filter with ?q= and focus INV when landing on #invoices
  useEffect(() => {
    const setFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      setFilter(params.get("q") || "");
    };
    setFromURL();

    const onPop = () => setFromURL();
    const onHash = () => {
      if (window.location.hash.replace('#','') === 'invoices') {
        numberInputRef.current?.focus();
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    if (defaultTab === 'invoices') {
      numberInputRef.current?.focus();
    }
  }, [defaultTab]);

  return (
    <>
      <SEO
        title="Dashboard | AS Invoice Generator"
        description="Invoice dashboard with KPIs and AI tools for UK construction."
      />
      <main className="grid gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">Business Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <button
              className="button button-sm sm:!px-4 sm:!py-2"
              onClick={() => {
                setTab('invoices');
                window.location.hash = 'invoices';
                setTimeout(() => {
                  numberInputRef.current?.focus();
                  numberInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 0);
              }}
            >
              New Invoice
            </button>
            <Link to="/invoices" className="button-secondary button-secondary-sm sm:!px-4 sm:!py-2">Open Invoice Generator</Link>
            <button className="button-secondary button-secondary-sm sm:!px-4 sm:!py-2" onClick={exportCSV}>Export CSV</button>
            <button
              className="button-secondary button-secondary-sm sm:!px-4 sm:!py-2"
              onClick={() => {
                localStorage.removeItem(LS_KEY);
                setRows([]);
              }}
            >
              Clear All
            </button>
          </div>
        </div>

      <Tabs value={tab} onValueChange={(v)=>{ setTab(v); window.location.hash = v; if (v === 'invoices') setTimeout(()=> numberInputRef.current?.focus(), 0); }}>
        <TabsList className="mb-4 flex flex-wrap gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="smartops">SmartOps</TabsTrigger>
          <TabsTrigger value="tenders">Tenders</TabsTrigger>
          <TabsTrigger value="rams">RAMS</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="diag">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Business Overview</h2>
            <div className="grid sm:grid-cols-4 gap-4">
              <KPITile label="Outstanding" value={`£${kpi.outstanding.toFixed(2)}`} />
              <KPITile label="Overdue" value={`£${kpi.overdue.toFixed(2)}`} />
              <KPITile label="Overdue Invoices" value={`${kpi.overdueCount}`} />
              <KPITile
                label="Next Due"
                value={kpi.nextDue ? `${kpi.nextDue.client} (${kpi.nextDue.dueDate})` : "—"}
              />
            </div>
            <div className="mt-4 text-sm text-gray-300">
              Next due: {kpi.nextDue ? `${kpi.nextDue.client} (${kpi.nextDue.dueDate})` : "—"}
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" stroke="currentColor" />
                  <YAxis stroke="currentColor" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Outstanding" fill="hsl(var(--emerald))" />
                  <Bar dataKey="Paid" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4" id="invoices">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">Invoice Tracker</h2>

            <div className="grid md:grid-cols-5 gap-2 mb-3">
              <input
                className="input"
                placeholder="INV number"
                ref={numberInputRef}
                value={newRow.number}
                onChange={(e) => setNewRow({ ...newRow, number: e.target.value })}
              />
              <input
                className="input"
                placeholder="Client"
                value={newRow.client}
                onChange={(e) => setNewRow({ ...newRow, client: e.target.value })}
              />
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Total (£)"
                value={newRow.total}
                onChange={(e) => setNewRow({ ...newRow, total: Number(e.target.value) })}
              />
              <input
                className="input"
                type="date"
                value={newRow.dueDate || ""}
                onChange={(e) => setNewRow({ ...newRow, dueDate: e.target.value })}
              />
              <div className="flex gap-2">
                <select
                  className="input"
                  value={newRow.status}
                  onChange={(e) =>
                    setNewRow({ ...newRow, status: e.target.value as InvoiceRow["status"] })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button className="button" onClick={addRow} aria-label="Add invoice">
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 gap-2">
              <input
                className="input w-full md:w-80"
                placeholder="Filter invoices..."
                aria-label="Filter invoices"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button className="button-secondary" onClick={remindAllOverdue} aria-label="Remind all overdue">
                  Remind overdue
                </button>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr className="text-left">
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Total (£)</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.number}</td>
                    <td>{r.client}</td>
                    <td>{r.total.toFixed(2)}</td>
                    <td>{r.dueDate || "—"}</td>
                    <td
                      className={
                        r.status === "overdue"
                          ? "text-red-400"
                          : r.status === "paid"
                          ? "text-emerald-400"
                          : "text-gray-300"
                      }
                    >
                      {r.status}
                    </td>
                      <td className="text-right flex gap-2 justify-end">
                        <button className="button-secondary" onClick={() => openReminder(i)}>
                          Remind
                        </button>
                        {r.status !== "paid" && (
                          <button className="button" onClick={() => markPaid(i)}>
                            Mark paid
                          </button>
                        )}
                        <button className="button-secondary" onClick={() => removeRow(i)}>
                          Delete
                        </button>
                      </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-gray-400 py-4">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">AI Agent</h2>
            <p className="text-sm text-gray-300 mb-3">
              Ask things like: <em>“Who is overdue and by how much?”</em>, <em>“Draft a polite payment reminder to {"{client}"}”</em>, <em>“Projected cash flow this month?”</em>
            </p>
            <AgentChat />
          </section>
        </TabsContent>

        <TabsContent value="smartops" className="space-y-4">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">SmartOps Panel (UK Construction)</h2>
            <p className="text-sm text-gray-300 mb-3">Run a health scan, search tenders, generate quotes, and get VAT/CIS advice.</p>
            <SmartOpsPanel />
          </section>
        </TabsContent>

        <TabsContent value="tenders" className="space-y-4" id="tenders">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">TenderBot (Website Scraper)</h2>
            <p className="text-sm text-gray-300 mb-3">Crawl tender portals and extract pages using Firecrawl.</p>
            <TenderBot />
          </section>
        </TabsContent>

        <TabsContent value="rams" className="space-y-4">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">RAMS Generator</h2>
            <p className="text-sm text-gray-300 mb-3">Generate a printable RAMS document for your project.</p>
            <RamsGenerator />
          </section>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">Construction Tools</h2>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <CISCalculator />
              </div>
              <article className="bg-gray-900 rounded-md p-4">
                <h3 className="font-semibold mb-2">Quick Links</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li><button className="underline" onClick={()=>{ setTab('rams'); window.location.hash = 'rams'; }}>RAMS Generator</button></li>
                  <li><button className="underline" onClick={()=>{ setTab('tenders'); window.location.hash = 'tenders'; }}>TenderBot</button></li>
                  <li><button className="underline" onClick={()=>{ setTab('smartops'); window.location.hash = 'smartops'; }}>SmartOps Panel</button></li>
                </ul>
              </article>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="diag" className="space-y-4">
          <section className="card animate-fade-in">
            <h2 className="text-lg font-semibold mb-3">Function Diagnostics</h2>
            <p className="text-sm text-gray-300 mb-3">Quickly verify all Edge Functions are reachable and returning data.</p>
            <FunctionDiagnostics />
          </section>
        </TabsContent>
        <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Reminder</DialogTitle>
              <DialogDescription>Generate or edit a reminder email. Copy and send from your email client.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <textarea className="input h-40" value={reminderMsg} onChange={(e)=>setReminderMsg(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button className="button-secondary" onClick={()=>{ navigator.clipboard.writeText(reminderMsg); toast?.({ title: "Copied", description: "Reminder copied to clipboard." }); }}>Copy</button>
                <button className="button" disabled={generating} onClick={generateReminder}>{generating ? "Generating…" : "Generate with AI"}</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
      </main>
    </>
  );
}

function KPITile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-md p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
