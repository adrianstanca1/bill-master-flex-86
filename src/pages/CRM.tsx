import React, { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { listClients, createClient, getStoredUser } from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PROJECTS_KEY = "as-projects";

interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: Record<string, unknown> | null;
}

interface Project {
  id: string;
  companyId?: string | null;
  name: string;
  client?: string | null;
  location?: string | null;
}

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
    if (user) {
      setCompanyId(user.id);
      setCompanyName(user.company_name || null);
    }
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
        const raw = localStorage.getItem(PROJECTS_KEY);
        const all: Project[] = raw ? JSON.parse(raw) : [];
        setProjects(all.filter((p) => p.companyId === companyId));
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

  const saveProject = () => {
    if (!companyId || !newProject.name.trim()) return;
    const project: Project = {
      id: crypto.randomUUID(),
      companyId,
      name: newProject.name.trim(),
      client: newProject.client || null,
      location: newProject.location || null,
    };
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const all: Project[] = raw ? JSON.parse(raw) : [];
      const next = [project, ...all];
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
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
                    <div className="text-sm text-muted-foreground">{p.client || "No client"} {p.location ? `• ${p.location}` : ""}</div>
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
