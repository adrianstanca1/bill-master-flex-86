import React, { useMemo, useState } from "react";
import { aiChat } from "@/lib/invoicesmart";
import DOMPurify from "dompurify";

export default function RamsGenerator() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState("");
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string>("");

  const project = useMemo(
    () => ({
      name,
      location,
      description,
      date,
      tasks: tasks
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }),
    [name, location, description, date, tasks]
  );

  async function generate() {
    if (!name) return alert("Project name is required");
    setLoading(true);
    setHtml("");
    try {
      const { reply } = await aiChat(
        `Generate a printable RAMS document (HTML body only) for a UK construction project: ${JSON.stringify(project)}. Include method statement, hazards, control measures, and PPE.`
      );
      setHtml(DOMPurify.sanitize(reply || ""));
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to generate RAMS.";
      const msg = message.includes("JWT") || message.includes("401") ? "Please sign in to use the RAMS generator." : message;
      setHtml(`<p>${msg}</p>`);
    } finally {
      setLoading(false);
    }
  }

  function openPrint() {
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(DOMPurify.sanitize(html));
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="grid gap-3">
      <div className="grid md:grid-cols-2 gap-2">
        <input className="input" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input md:col-span-2" placeholder="Tasks (comma separated)" value={tasks} onChange={(e) => setTasks(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="button" onClick={generate} disabled={loading}>{loading ? "Generating…" : "Generate RAMS"}</button>
        <button className="button-secondary" onClick={openPrint} disabled={!html}>Print / Open</button>
      </div>

      {html && (
        <div className="bg-gray-900 rounded-md p-3 max-h-[400px] overflow-auto">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
        </div>
      )}
    </div>
  );
}
