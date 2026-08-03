import React from "react";
import FunctionDiagnostics from "@/components/FunctionDiagnostics";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

export default function ToolSetup() {
  return (
    <main className="container mx-auto grid gap-6 animate-fade-in">
      <SEO title="Tool Setup | AI functions & keys" description="Configure API keys and verify InvoiceSmart AI endpoints." noindex />
      <header className="pt-6">
        <h1 className="text-2xl font-bold">Important information for tool setup</h1>
        <p className="text-text-secondary">Configure required API keys and settings in InvoiceSmart Settings.</p>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">AI Functions</h2>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>AI chat, advisor, quote generation, tax advice, and RAMS all use the InvoiceSmart /api/ai endpoints.</li>
          <li>Configure your AI provider, model, endpoint, and API key in <Link className="link" to="/settings">Settings</Link>.</li>
          <li>Supported providers include OpenAI and OpenRouter.</li>
          <li>Sign in before invoking AI tools.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">TenderBot</h2>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>TenderBot now uses the InvoiceSmart AI chat endpoint to extract tender opportunities from URLs.</li>
          <li>Ensure the URL is https and within allowed scope.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">SmartOps</h2>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>Enter your Company ID in <Link className="link" to="/settings">Settings</Link>.</li>
          <li>Requires you to be signed in. Data access is protected by JWT auth.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Quick Diagnostics</h2>
        <p className="text-sm text-text-secondary mb-3">Run all health checks. Failed items will include suggested fixes.</p>
        <FunctionDiagnostics />
      </section>
    </main>
  );
}
