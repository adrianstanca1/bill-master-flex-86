import React, { useEffect, useMemo, useRef, useState } from "react";
import { aiChat } from "@/lib/invoicesmart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMsg { role: "user" | "assistant"; content: string }

export const AdvisorAgent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I’m your Business Advisor. Ask me to review cash flow, tenders, ops risks, or suggest improvements." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !busy, [input, busy]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const history = messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));
      const { reply } = await aiChat(text, history);
      setMessages((m) => [...m, { role: "assistant", content: reply || "I couldn’t generate advice right now." }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (canSend) send();
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Business Advisor & Supervisor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-[360px] overflow-auto rounded-md border p-3 bg-muted/20">
            {messages.map((m, i) => (
              <div key={i} className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">{m.role === "user" ? "You" : "Advisor"}</div>
                <div className={m.role === "user" ? "rounded-md bg-background border p-3" : "rounded-md bg-primary/5 p-3"}>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.content}</pre>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="grid gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask for an audit, risks, roadmap, pricing suggestions… (Ctrl/Cmd+Enter to send)"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Button onClick={send} disabled={!canSend}>
                {busy ? "Thinking…" : "Send"}
              </Button>
              <div className="text-xs text-muted-foreground">
                Tip: "Review operations and propose a 30-60-90 day plan"
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
