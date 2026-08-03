import React, { useEffect, useMemo, useState } from "react";
import { applyUserTheme, loadTheme, saveTheme, ThemePreset, ThemeSettings } from "@/lib/theme";
import { updateUserProfile } from "@/lib/invoicesmart";
import SEO from "@/components/SEO";

const LS = "as-settings";

type SettingsData = {
  companyId?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  industry?: string;
  targetMargin?: number;
  vatScheme?: "standard" | "flat-rate" | "cash-accounting";
  reverseCharge?: boolean;
  cis?: boolean;
  address?: string;
  website?: string;
  phone?: string;
  contactEmail?: string;
  vatNumber?: string;
  logoDataUrl?: string;
  onboarded?: boolean;
};

const defaults: SettingsData = {
  companyId: "",
  companyName: "",
  firstName: "",
  lastName: "",
  country: "UK",
  industry: "construction",
  targetMargin: 20,
  vatScheme: "standard",
  reverseCharge: true,
  cis: true,
};

export default function Setup() {
  const [data, setData] = useState<SettingsData>(defaults);
  const [theme, setTheme] = useState<ThemeSettings>(loadTheme());
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    // Load existing settings only
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setData({ ...defaults, ...(JSON.parse(raw) as SettingsData) });
    } catch {
      /* ignore malformed localStorage values */
    }
  }, []);

  const presets: { key: ThemePreset; name: string }[] = useMemo(
    () => [
      { key: "emerald", name: "Emerald" },
      { key: "blue", name: "Blue" },
      { key: "violet", name: "Violet" },
      { key: "orange", name: "Orange" },
    ],
    []
  );

  function onLogoChange(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setData((d) => ({ ...d, logoDataUrl: url }));
      setLogoPreview(url);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    const toSave = { ...data, onboarded: true };
    localStorage.setItem(LS, JSON.stringify(toSave));
    saveTheme(theme);
    applyUserTheme(theme);
    try {
      await updateUserProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName,
        vat_number: data.vatNumber,
        phone: data.phone,
        address: data.address ? { raw: data.address } : null,
      });
    } catch (e) {
      // Non-fatal: local settings are already saved.
      console.warn("Profile sync failed", e);
    }
    setTimeout(() => setSaving(false), 600);
  }

  return (
    <main className="container mx-auto grid gap-6 animate-fade-in">
      <SEO title="Setup | Personalize your workspace" description="Set up company info, VAT scheme, and choose your visual style." noindex />
      <header className="pt-6">
        <h1 className="text-2xl font-bold">Welcome! Let’s personalize your workspace</h1>
        <p className="text-text-secondary">These settings power SmartOps, Quotes, and Tax tools. You can change them anytime.</p>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Company details</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="First name" value={data.firstName||""} onChange={(e)=>setData({ ...data, firstName: e.target.value })} />
          <input className="input" placeholder="Last name" value={data.lastName||""} onChange={(e)=>setData({ ...data, lastName: e.target.value })} />
          <input className="input" placeholder="Company name" value={data.companyName||""} onChange={(e)=>setData({ ...data, companyName: e.target.value })} />
          <input className="input" placeholder="Company ID" value={data.companyId||""} onChange={(e)=>setData({ ...data, companyId: e.target.value })} />
          <input className="input" placeholder="VAT number" value={data.vatNumber||""} onChange={(e)=>setData({ ...data, vatNumber: e.target.value })} />
          <input className="input" placeholder="Country" value={data.country||""} onChange={(e)=>setData({ ...data, country: e.target.value })} />
          <input className="input" placeholder="Industry" value={data.industry||""} onChange={(e)=>setData({ ...data, industry: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Address" value={data.address||""} onChange={(e)=>setData({ ...data, address: e.target.value })} />
          <input className="input" placeholder="Website" value={data.website||""} onChange={(e)=>setData({ ...data, website: e.target.value })} />
          <input className="input" placeholder="Phone" value={data.phone||""} onChange={(e)=>setData({ ...data, phone: e.target.value })} />
          <input className="input" type="email" placeholder="Contact email" value={data.contactEmail||""} onChange={(e)=>setData({ ...data, contactEmail: e.target.value })} />
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Tax & pricing</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <select className="input" value={data.vatScheme} onChange={(e)=>setData({ ...data, vatScheme: e.target.value as SettingsData["vatScheme"] })}>
            <option value="standard">Standard VAT</option>
            <option value="flat-rate">Flat-rate</option>
            <option value="cash-accounting">Cash accounting</option>
          </select>
          <input className="input" type="number" min={0} max={90} placeholder="Target margin %" value={data.targetMargin}
                 onChange={(e)=>setData({ ...data, targetMargin: Number(e.target.value) })} />
          <select className="input" value={data.reverseCharge?"yes":"no"} onChange={(e)=>setData({ ...data, reverseCharge: e.target.value === "yes" })}>
            <option value="yes">Reverse charge ON</option>
            <option value="no">Reverse charge OFF</option>
          </select>
          <select className="input" value={data.cis?"yes":"no"} onChange={(e)=>setData({ ...data, cis: e.target.value === "yes" })}>
            <option value="yes">CIS ON</option>
            <option value="no">CIS OFF</option>
          </select>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Branding</h2>
        <div className="grid md:grid-cols-2 gap-3 items-start">
          <div className="grid gap-2">
            <label className="text-sm text-text-secondary">Upload logo</label>
            <input className="input" type="file" accept="image/*" onChange={(e)=>onLogoChange(e.target.files?.[0])} />
            { (data.logoDataUrl || logoPreview) && (
              <div className="mt-2">
                <img src={data.logoDataUrl || logoPreview || ""} alt="Company logo preview" className="max-h-24 rounded-md border" loading="lazy" />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-text-secondary">Theme preset</label>
            <div className="flex gap-2 flex-wrap">
              {presets.map((p)=> (
                <button key={p.key} type="button" onClick={()=>{ const next = { ...theme, preset: p.key }; setTheme(next); applyUserTheme(next); }}
                  className={`button-secondary ${theme.preset===p.key?"ring-2 ring-primary":""}`}>{p.name}</button>
              ))}
            </div>
            <label className="text-sm text-text-secondary mt-3">Corner radius ({theme.radius}px)</label>
            <input className="input" type="range" min={6} max={20} value={theme.radius} onChange={(e)=>{ const next = { ...theme, radius: Number(e.target.value) }; setTheme(next); applyUserTheme(next); }} />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex gap-2">
          <button className="button" onClick={save} disabled={saving}>{saving?"Saving…":"Save and continue"}</button>
        </div>
      </section>
    </main>
  );
}
