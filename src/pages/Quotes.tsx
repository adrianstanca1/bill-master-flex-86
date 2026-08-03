import React, { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import {
  listQuotes,
  createQuote,
  sendQuote,
  deleteQuote,
  convertQuoteToInvoice,
  getStoredUser,
  type ApiError,
  type Quote,
} from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface QuoteView {
  id: string;
  title: string;
  quoteNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

function mapQuoteToView(quote: Quote): QuoteView {
  return {
    id: quote.id,
    title: quote.title || "Untitled quote",
    quoteNumber: quote.quote_number,
    total: Number(quote.total || 0),
    status: String(quote.status || "draft"),
    createdAt: quote.created_at || "",
  };
}

const Quotes: React.FC = () => {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QuoteView[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const loadQuotes = useCallback(async () => {
    try {
      const data = await listQuotes();
      setQuotes(data.map(mapQuoteToView));
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to load quotes",
        description: apiErr.message || "Could not fetch quotes",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      const user = getStoredUser();
      setCompanyName(user?.company_name || null);
      await loadQuotes();
    };
    init();
  }, [loadQuotes]);

  const addQuote = async () => {
    if (!companyName || !newTitle.trim()) return;
    const title = newTitle.trim();
    try {
      await createQuote({
        title,
        items: [{ description: title, quantity: 1, unit_price: 0 }],
      });
      setNewTitle("");
      toast({ title: "Quote created" });
      await loadQuotes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Could not create quote",
        description: apiErr.message || "Request failed",
        variant: "destructive",
      });
    }
  };

  const handleSend = async (q: QuoteView) => {
    try {
      const res = await sendQuote(q.id);
      toast({
        title: res.success ? "Quote sent" : "Quote marked as sent",
        description: res.email?.error || undefined,
        variant: res.success ? "default" : "destructive",
      });
      await loadQuotes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to send quote",
        description: apiErr.message || "Request failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (q: QuoteView) => {
    if (!window.confirm(`Delete quote ${q.quoteNumber}?`)) return;
    try {
      await deleteQuote(q.id);
      toast({ title: "Quote deleted" });
      await loadQuotes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to delete quote",
        description: apiErr.message || "Request failed",
        variant: "destructive",
      });
    }
  };

  const handleConvert = async (q: QuoteView) => {
    const prefix = window.prompt("Invoice prefix? (e.g. INV)") || undefined;
    try {
      const invoice = await convertQuoteToInvoice(
        q.id,
        prefix ? { invoice_prefix: prefix } : undefined
      );
      toast({
        title: "Converted to invoice",
        description: invoice.invoice_number,
      });
      await loadQuotes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Conversion failed",
        description: apiErr.message || "Could not convert quote",
        variant: "destructive",
      });
    }
  };

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Quotes",
      description: "Create quotes and convert them to invoices",
    }),
    []
  );

  return (
    <main>
      <SEO
        title="Quotes | UK Construction"
        description="Create quotes and convert them to invoices."
        jsonLd={jsonLd}
      />
      <h1 className="sr-only">Quotes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Quote title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button onClick={addQuote} disabled={!companyName}>
              New Quote
            </Button>
          </div>
          <ul className="space-y-2">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div>
                  <div className="font-medium">{q.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {q.quoteNumber} • Total £{q.total.toFixed(2)} •{" "}
                    {new Date(q.createdAt).toLocaleDateString()} •{" "}
                    <span className="capitalize">{q.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {q.status === "draft" && (
                    <Button
                      variant="outline"
                      onClick={() => handleSend(q)}
                    >
                      Send
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleConvert(q)}
                  >
                    Convert to Invoice
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(q)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            {quotes.length === 0 && (
              <div className="text-sm text-muted-foreground">No quotes yet.</div>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
};

export default Quotes;
