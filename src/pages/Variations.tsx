import React, { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import {
  listProjects,
  listVariations,
  createVariation,
  deleteVariation,
  approveVariation,
  convertVariationToInvoice,
  type Project,
  type Variation,
  type ApiError,
} from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Variations: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ projectId: "", title: "", total: "" });

  const loadProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to load projects",
        description: apiErr.message || "Could not fetch projects",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadVariations = useCallback(async () => {
    try {
      const data = await listVariations();
      setVariations(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to load variations",
        description: apiErr.message || "Could not fetch variations",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadProjects(), loadVariations()]);
      if (mounted) setLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [loadProjects, loadVariations]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const add = async () => {
    if (!form.projectId || !form.title.trim()) return;
    const total = Number(form.total || 0);
    try {
      await createVariation({
        project_id: form.projectId,
        title: form.title.trim(),
        items: [
          {
            description: form.title.trim(),
            quantity: 1,
            unit_price: total,
          },
        ],
        status: "proposed",
      });
      setForm({ projectId: "", title: "", total: "" });
      toast({ title: "Variation created" });
      await loadVariations();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Could not create variation",
        description: apiErr.message || "Request failed",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveVariation(id);
      toast({ title: "Variation approved" });
      await loadVariations();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Approval failed",
        description: apiErr.message || "Could not approve variation",
        variant: "destructive",
      });
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await convertVariationToInvoice(id);
      toast({ title: "Converted to invoice" });
      await loadVariations();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Conversion failed",
        description: apiErr.message || "Could not convert variation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this variation?")) return;
    try {
      await deleteVariation(id);
      toast({ title: "Variation deleted" });
      await loadVariations();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Delete failed",
        description: apiErr.message || "Could not delete variation",
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
                    {p.client_name ? ` (${p.client_name})` : ""}
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
          <Button onClick={add} disabled={!form.projectId || !form.title.trim()}>
            Add Variation
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>All Variations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
            <ul className="space-y-2">
              {variations.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div>
                    <div className="font-medium">{v.title}</div>
                    <div className="text-sm text-muted-foreground">
                      £{Number(v.total ?? 0).toFixed(2)} •{" "}
                      {v.created_at
                        ? new Date(v.created_at).toLocaleDateString()
                        : "—"}{" "}
                      • {v.status}
                      {projectNameById.get(v.project_id)
                        ? ` • ${projectNameById.get(v.project_id)}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.status === "proposed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(v.id)}
                      >
                        Approve
                      </Button>
                    )}
                    {v.status !== "invoiced" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConvert(v.id)}
                      >
                        Convert to Invoice
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(v.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
              {variations.length === 0 && !loading && (
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
