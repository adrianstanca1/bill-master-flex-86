import React, { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { createTransaction } from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const PROJECTS_KEY = "as-projects";
const VARIATIONS_KEY = "as-variations";

interface Project {
  id: string;
  name: string;
  client: string;
  location?: string;
}

interface Variation {
  id: string;
  projectId: string;
  title: string;
  total: number;
  status: string;
  createdAt: string;
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function loadVariations(): Variation[] {
  try {
    const raw = localStorage.getItem(VARIATIONS_KEY);
    return raw ? (JSON.parse(raw) as Variation[]) : [];
  } catch {
    return [];
  }
}

function saveVariations(items: Variation[]): void {
  localStorage.setItem(VARIATIONS_KEY, JSON.stringify(items));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const Variations: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [form, setForm] = useState({ projectId: "", title: "", total: "" });

  useEffect(() => {
    setProjects(loadProjects());
    setVariations(loadVariations());
  }, []);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const add = async () => {
    if (!form.projectId || !form.title.trim()) return;
    const total = Number(form.total || 0);
    const variation: Variation = {
      id: makeId(),
      projectId: form.projectId,
      title: form.title.trim(),
      total,
      status: "proposed",
      createdAt: new Date().toISOString(),
    };
    const next = [variation, ...variations];
    saveVariations(next);
    setVariations(next);
    setForm({ projectId: "", title: "", total: "" });

    try {
      await createTransaction({
        type: "expense",
        amount: total,
        description: variation.title,
      });
      toast({ title: "Variation created" });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Could not sync expense to InvoiceSmart";
      toast({
        title: "Variation created locally",
        description: message,
        variant: "destructive",
      });
    }
  };

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Variations & Change Orders",
      description: "Create and manage variations/change orders",
    }),
    []
  );

  return (
    <main>
      <SEO
        title="Variations & Change Orders | UK Construction"
        description="Create and manage variations/change orders."
        jsonLd={jsonLd}
      />
      <h1 className="sr-only">Variations & Change Orders</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Variation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm((s) => ({ ...s, projectId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            />
            <Input
              placeholder="Total (£)"
              type="number"
              inputMode="decimal"
              value={form.total}
              onChange={(e) => setForm((s) => ({ ...s, total: e.target.value }))}
            />
          </div>
          <Button onClick={add}>Add Variation</Button>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>All Variations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {variations.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div>
                    <div className="font-medium">{v.title}</div>
                    <div className="text-sm text-muted-foreground">
                      £{(v.total ?? 0).toFixed(2)} •{" "}
                      {new Date(v.createdAt).toLocaleDateString()} • {v.status}
                      {projectNameById.get(v.projectId)
                        ? ` • ${projectNameById.get(v.projectId)}`
                        : ""}
                    </div>
                  </div>
                </li>
              ))}
              {variations.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No variations yet.
                </div>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Variations;
