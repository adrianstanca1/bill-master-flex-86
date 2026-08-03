import React, { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import {
  listInvoices,
  createInvoice,
  sendInvoice,
  updateInvoice,
  getStoredUser,
  type ApiError,
  type Invoice,
} from "@/lib/invoicesmart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface QuoteView {
  id: string;
  title: string;
  total: number;
  createdAt: string;
  invoiceNumber: string;
}

function mapInvoiceToQuote(invoice: Invoice): QuoteView {
  const title =
    invoice.notes ||
    invoice.line_items?.[0]?.description ||
    "Untitled quote";
  return {
    id: invoice.id,
    title,
    total: Number(invoice.total_amount || 0),
    createdAt: invoice.created_at || "",
    invoiceNumber: invoice.invoice_number,
  };
}

const Quotes: React.FC = () => {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QuoteView[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const loadQuotes = useCallback(async () => {
    try {
      const invoices = await listInvoices("draft");
      setQuotes(invoices.map(mapInvoiceToQuote));
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Failed to load quotes",
        description: apiErr.message || "Could not fetch draft invoices",
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
      await createInvoice({
        status: "draft",
        notes: title,
        line_items: [{ description: title, quantity: 1, unit_price: 0 }],
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

  const convertToInvoice = async (q: QuoteView) => {
    const number = window.prompt("Invoice number? (e.g. INV-1001)") || undefined;
    const dueDate = window.prompt("Invoice due date (YYYY-MM-DD)?") || undefined;
    try {
      if (number || dueDate) {
        await updateInvoice(q.id, {
          invoice_number: number,
          due_date: dueDate,
        });
      }
      await sendInvoice(q.id);
      toast({
        title: "Converted to invoice",
        description: q.invoiceNumber,
      });
      await loadQuotes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast({
        title: "Conversion failed",
        description: apiErr.message || "Could not send invoice",
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
                    Total £{q.total.toFixed(2)} •{" "}
                    {new Date(q.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => convertToInvoice(q)}
                  >
                    Convert to Invoice
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
