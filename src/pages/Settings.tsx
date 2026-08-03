import React, { useEffect, useState } from "react";
import { updateUserProfile, getSettings, updateSettings } from "@/lib/invoicesmart";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

const LS = "as-settings";

const AI_API_KEY_MASK = "********";

type SettingsData = {
  companyId?: string;
  companyName?: string;
  vatNumber?: string;
  phone?: string;
  address?: string;
  country?: string;
  industry?: string;
  targetMargin?: number;
  vatScheme?: "standard" | "flat-rate" | "cash-accounting";
  reverseCharge?: boolean;
  cis?: boolean;
  contactEmail?: string;
  website?: string;
};

const defaults: SettingsData = {
  companyId: "",
  companyName: "",
  vatNumber: "",
  phone: "",
  address: "",
  country: "UK",
  industry: "construction",
  targetMargin: 20,
  vatScheme: "standard",
  reverseCharge: true,
  cis: true,
};

function mergeBackendSettings(settings: Record<string, unknown>, data: SettingsData): SettingsData {
  const next: SettingsData = { ...data };
  const raw = settings;
  if (raw.companyId !== undefined && raw.companyId !== null) next.companyId = String(raw.companyId);
  if (raw.companyName !== undefined && raw.companyName !== null) next.companyName = String(raw.companyName);
  if (raw.vatNumber !== undefined && raw.vatNumber !== null) next.vatNumber = String(raw.vatNumber);
  if (raw.phone !== undefined && raw.phone !== null) next.phone = String(raw.phone);
  if (raw.country !== undefined && raw.country !== null) next.country = String(raw.country);
  if (raw.industry !== undefined && raw.industry !== null) next.industry = String(raw.industry);
  if (raw.contactEmail !== undefined && raw.contactEmail !== null) next.contactEmail = String(raw.contactEmail);
  if (raw.website !== undefined && raw.website !== null) next.website = String(raw.website);
  if (raw.targetMargin !== undefined && raw.targetMargin !== null) next.targetMargin = Number(raw.targetMargin);
  if (raw.vatScheme === "standard" || raw.vatScheme === "flat-rate" || raw.vatScheme === "cash-accounting") next.vatScheme = raw.vatScheme;
  if (raw.reverseCharge !== undefined && raw.reverseCharge !== null) next.reverseCharge = Boolean(raw.reverseCharge);
  if (raw.cis !== undefined && raw.cis !== null) next.cis = Boolean(raw.cis);
  if (raw.address !== undefined && raw.address !== null) {
    if (typeof raw.address === "string") {
      next.address = raw.address;
    } else if (typeof raw.address === "object") {
      const rawAddress = raw.address as Record<string, unknown>;
      if (rawAddress.raw !== undefined) next.address = String(rawAddress.raw);
      else next.address = JSON.stringify(raw.address);
    }
  }
  return next;
}

export default function Settings() {
  const { toast } = useToast();
  const [data, setData] = useState<SettingsData>(defaults);
  const [backend, setBackend] = useState<Record<string, string | number | boolean | null | undefined>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setData((prev) => mergeBackendSettings({}, { ...defaults, ...(JSON.parse(raw) as SettingsData) }));
    } catch {
      /* ignore malformed localStorage values */
    }
  }, []);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const settings = (s as Record<string, unknown>) || {};
        setBackend(settings);
        setData((prev) => mergeBackendSettings(settings, prev));
      })
      .catch((e) => {
        console.warn("Could not load backend settings", e);
      });
  }, []);

  async function save() {
    localStorage.setItem(LS, JSON.stringify(data));
    setSaved(false);

    try {
      await updateUserProfile({
        company_name: data.companyName,
        vat_number: data.vatNumber,
        phone: data.phone,
        address: data.address ? { raw: data.address } : null,
      });
    } catch (e) {
      console.warn("Profile sync failed", e);
    }

    try {
      const payload: Record<string, string | number | boolean | null | undefined> = {
        companyId: data.companyId,
        companyName: data.companyName,
        vatNumber: data.vatNumber,
        phone: data.phone,
        address: data.address ? { raw: data.address } : null,
        country: data.country,
        industry: data.industry,
        targetMargin: data.targetMargin,
        vatScheme: data.vatScheme,
        reverseCharge: data.reverseCharge,
        cis: data.cis,
        contactEmail: data.contactEmail,
        website: data.website,
      };
      for (const [key, value] of Object.entries(backend)) {
        if (value === AI_API_KEY_MASK) continue; // don't send masked secrets back
        if (value !== undefined && value !== "") payload[key] = value;
      }
      await updateSettings(payload);
      const refreshed = await getSettings();
      setBackend(refreshed || {});
      setData((prev) => mergeBackendSettings((refreshed as Record<string, unknown>) || {}, prev));
      toast({ title: "Settings saved" });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save backend settings";
      toast({ title: "Backend settings failed", description: message, variant: "destructive" });
    }
  }

  return (
    <main className="container mx-auto grid gap-6 animate-fade-in">
      <SEO title="Settings | UK Construction" description="Manage company, VAT/CIS, and defaults for quotes and tax." noindex />
      <header className="pt-6">
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-text-secondary">These settings pre-fill SmartOps, Quotes and Tax tabs.</p>
      </header>

      <section className="card">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Company name" value={data.companyName}
            onChange={(e) => setData({ ...data, companyName: e.target.value })} />
          <input className="input" placeholder="VAT number" value={data.vatNumber}
            onChange={(e) => setData({ ...data, vatNumber: e.target.value })} />
          <input className="input" placeholder="Phone" value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })} />
          <input className="input" placeholder="Address" value={data.address}
            onChange={(e) => setData({ ...data, address: e.target.value })} />
          <input className="input" type="email" placeholder="Contact email" value={data.contactEmail || ""}
            onChange={(e) => setData({ ...data, contactEmail: e.target.value })} />
          <input className="input" placeholder="Website" value={data.website || ""}
            onChange={(e) => setData({ ...data, website: e.target.value })} />
          <input className="input" placeholder="Company ID" value={data.companyId}
            onChange={(e) => setData({ ...data, companyId: e.target.value })} />
          <input className="input" placeholder="Country" value={data.country}
            onChange={(e) => setData({ ...data, country: e.target.value })} />
          <input className="input" placeholder="Industry" value={data.industry}
            onChange={(e) => setData({ ...data, industry: e.target.value })} />
          <input className="input" type="number" min={0} max={90} placeholder="Target margin %" value={data.targetMargin}
            onChange={(e) => setData({ ...data, targetMargin: Number(e.target.value) })} />
          <select className="input" value={data.vatScheme}
            onChange={(e) => setData({ ...data, vatScheme: e.target.value as SettingsData["vatScheme"] })}>
            <option value="standard">Standard VAT</option>
            <option value="flat-rate">Flat-rate</option>
            <option value="cash-accounting">Cash accounting</option>
          </select>
          <select className="input" value={data.reverseCharge ? "yes" : "no"}
            onChange={(e) => setData({ ...data, reverseCharge: e.target.value === "yes" })}>
            <option value="yes">Reverse charge ON</option>
            <option value="no">Reverse charge OFF</option>
          </select>
          <select className="input" value={data.cis ? "yes" : "no"}
            onChange={(e) => setData({ ...data, cis: e.target.value === "yes" })}>
            <option value="yes">CIS ON</option>
            <option value="no">CIS OFF</option>
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="button" onClick={save}>Save Settings</button>
          {saved && <span className="text-text-secondary">Saved ✓</span>}
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">InvoiceSmart backend settings</h2>
        <p className="text-sm text-text-secondary mb-3">These are stored server-side and drive AI completions and invoice defaults.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="AI provider (e.g. openai, openrouter)" value={String(backend?.aiProvider || "")}
            onChange={(e) => setBackend({ ...backend, aiProvider: e.target.value })} />
          <input className="input" placeholder="AI model (e.g. gpt-4o)" value={String(backend?.aiModel || "")}
            onChange={(e) => setBackend({ ...backend, aiModel: e.target.value })} />
          <input className="input md:col-span-2" placeholder="AI endpoint URL" value={String(backend?.aiEndpoint || "")}
            onChange={(e) => setBackend({ ...backend, aiEndpoint: e.target.value })} />
          <input className="input md:col-span-2" type="password" placeholder="AI API key (leave blank to keep existing)" value={String(backend?.aiApiKey || "")}
            onChange={(e) => setBackend({ ...backend, aiApiKey: e.target.value })} />
          <input className="input" placeholder="Invoice prefix" value={String(backend?.invoicePrefix || "")}
            onChange={(e) => setBackend({ ...backend, invoicePrefix: e.target.value })} />
          <select className="input" value={backend?.autoIncrement === false ? "no" : "yes"}
            onChange={(e) => setBackend({ ...backend, autoIncrement: e.target.value === "yes" })}>
            <option value="yes">Auto-increment invoice numbers</option>
            <option value="no">Manual invoice numbers</option>
          </select>
          <input className="input" type="number" step="0.01" placeholder="Default tax rate %" value={String(backend?.defaultTaxRate ?? "")}
            onChange={(e) => setBackend({ ...backend, defaultTaxRate: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <input className="input" placeholder="Default payment terms" value={String(backend?.defaultTerms || "")}
            onChange={(e) => setBackend({ ...backend, defaultTerms: e.target.value })} />
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">How these are used</h2>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>Company ID is used for SmartOps scans (temporary until onboarding).</li>
          <li>Country/Industry pre-fill Tender search filters.</li>
          <li>Target margin sets default for Quote generator.</li>
          <li>VAT scheme, Reverse charge and CIS pre-fill Tax advice.</li>
        </ul>
      </section>
    </main>
  );
}
