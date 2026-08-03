import React, { useEffect, useState } from "react";
import { updateUserProfile } from "@/lib/invoicesmart";
import SEO from "@/components/SEO";

const LS = "as-settings";

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

export default function Settings() {
  const [data, setData] = useState<SettingsData>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setData({ ...defaults, ...(JSON.parse(raw) as SettingsData) });
    } catch {
      /* ignore malformed localStorage values */
    }
  }, []);

  async function save() {
    localStorage.setItem(LS, JSON.stringify(data));
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
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
