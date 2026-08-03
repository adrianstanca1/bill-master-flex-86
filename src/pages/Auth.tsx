import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import SEO from "@/components/SEO";

export default function Auth() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const redirectTo = (location.state?.from?.pathname as string) || "/dashboard";

  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setTimeout(() => {
          const onboarded = (()=>{ try { return !!(JSON.parse(localStorage.getItem("as-settings")||"{}")?.onboarded); } catch { return false; } })();
          navigate(onboarded ? redirectTo : "/setup", { replace: true });
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const onboarded = (()=>{ try { return !!(JSON.parse(localStorage.getItem("as-settings")||"{}")?.onboarded); } catch { return false; } })();
        navigate(onboarded ? redirectTo : "/setup", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Account created", description: `Signed in as ${data?.user?.email || email}.` });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // After sign-in, route to setup if not onboarded yet
        const onboarded = (()=>{ try { return !!(JSON.parse(localStorage.getItem("as-settings")||"{}")?.onboarded); } catch { return false; } })();
        navigate(onboarded ? redirectTo : "/setup", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err?.message || "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md mx-auto py-10">
      <SEO title={mode === "signin" ? "Sign in" : "Create account"} description="Secure sign in/up for your dashboard" noindex />
      <h1 className="text-2xl font-bold mb-6">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <section className="card">
        <form className="grid gap-3" onSubmit={submit}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <button className="button" type="submit" disabled={loading}>{loading ? "Please wait…" : (mode === "signin" ? "Sign in" : "Sign up")}</button>
        </form>
        <div className="mt-4 text-sm">
          {mode === "signin" ? (
            <button className="link" onClick={()=>setMode("signup")}>New here? Create an account</button>
          ) : (
            <button className="link" onClick={()=>setMode("signin")}>Already have an account? Sign in</button>
          )}
        </div>
      </section>
    </main>
  );
}
