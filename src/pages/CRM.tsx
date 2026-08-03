import React, { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import {
  listClients,
  createClient,
  getStoredUser,
  getSettings,
  listProjects,
  createProject,
  Project,
  Client,
} from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CRM: React.FC = () => {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newClient, setNewClient] = useState({ name: "", email: "" });
  const [newProject, setNewProject] = useState({ name: "", client: "", location: "" });

  useEffect(() => {
    const user = getStoredUser();
    const fallback = user?.id || null;
    setCompanyName(user?.company_name || null);
    getSettings()
      .then((s) => {
        const id = (s as Record<string, unknown>)?.companyId;
        setCompanyId(typeof id === "string" && id ? id : fallback);
      })
      .catch(() => setCompanyId(fallback));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      try {
        const cs = await listClients();
        setClients(cs as Client[]);
      } catch (err) {
        toast({
          title: "Could not load clients",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
      try {
        const ps = await listProjects();
        setProjects(ps);
      } catch (err) {
        toast({
          title: "Could not load projects",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        setProjects([]);
      }
    };
    load();
  }, [companyId, toast]);

  const saveClient = async () => {
    if (!companyId || !newClient.name.trim()) return;
    try {
      const data = await createClient({
        name: newClient.name.trim(),
        email: newClient.email || null,
      });
      setClients([data as Client, ...clients]);
      setNewClient({ name: "", email: "" });
      toast({ title: "Client added", description: "Client saved successfully" });
    } catch (err) {
      toast({
        title: "Could not save client",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const saveProject = async () => {
    if (!companyId || !newProject.name.trim()) return;
    const clientName = newProject.client.trim() || null;
    let clientId: string | null = null;
    if (clientName) {
      const match = clients.find(
        (c) => c.name.localeCompare(clientName, undefined, { sensitivity: "base" }) === 0
      );
      if (match) clientId = match.id;
    }
    try {
      const project = await createProject({
        name: newProject.name.trim(),
        client_name: clientName,
        client_id: clientId,
        location: newProject.location || null,
      });
      setProjects([project, ...projects]);
      setNewProject({ name: "", client: "", location: "" });
      toast({ title: "Project added", description: "Project saved successfully" });
    } catch (err) {
      toast({
        title: "Could not save project",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Client & Project CRM",
    description: "Mini-CRM for clients and projects",
  }), []);

  return (
    <main>
      <SEO title="Client & Project CRM | UK Construction" description="Manage clients and projects in a simple mini-CRM." jsonLd={jsonLd} />
      <h1 className="sr-only">Client & Project CRM</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Client name" value={newClient.name} onChange={(e) => setNewClient((s) => ({ ...s, name: e.target.value }))} />
              <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient((s) => ({ ...s, email: e.target.value }))} />
              <Button onClick={saveClient} disabled={!companyId}>Add</Button>
            </div>
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.email || "No email"}</div>
                  </div>
                </li>
              ))}
              {clients.length === 0 && <div className="text-sm text-muted-foreground">No clients yet.</div>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Project name" value={newProject.name} onChange={(e) => setNewProject((s) => ({ ...s, name: e.target.value }))} />
              <Input placeholder="Client (name)" value={newProject.client} onChange={(e) => setNewProject((s) => ({ ...s, client: e.target.value }))} />
              <Input placeholder="Location" value={newProject.location} onChange={(e) => setNewProject((s) => ({ ...s, location: e.target.value }))} />
            </div>
            <Button onClick={saveProject} disabled={!companyId}>Add Project</Button>
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.client_name || "No client"} {p.location ? `• ${p.location}` : ""}</div>
                  </div>
                </li>
              ))}
              {projects.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default CRM;
