// InvoiceSmart API client — replaces Supabase for auth and data on this VPS.
// The backend is reachable at https://api.invoicesmart.cortexbuildpro.com

const API_BASE_URL =
  import.meta.env.VITE_INVOICESMART_API_URL ||
  "https://api.invoicesmart.cortexbuildpro.com";

const TOKEN_KEY = "invoicesmart_token";
const USER_KEY = "invoicesmart_user";

export interface ApiError {
  message: string;
  status: number;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  address?: Record<string, unknown> | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  vat_number?: string;
  phone?: string;
  address?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text || undefined;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error?: string }).error)
        : response.statusText || "Request failed";
    const err: ApiError = { message, status: response.status };
    throw err;
  }

  return data as T;
}

export async function register(
  payload: RegisterRequest
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me");
}

// ── Clients ────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  company_name?: string | null;
  vat_number?: string | null;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientInput {
  name: string;
  email?: string | null;
  company_name?: string | null;
  vat_number?: string | null;
  address?: Record<string, unknown> | string | null;
  phone?: string | null;
}

export interface ClientListResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listClients(): Promise<Client[]> {
  const res = await apiFetch<ClientListResponse>("/api/clients");
  return res.data || [];
}

export async function getClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${id}`);
}

export async function createClient(input: ClientInput): Promise<Client> {
  return apiFetch<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteClient(id: string): Promise<void> {
  return apiFetch<void>(`/api/clients/${id}`, { method: "DELETE" });
}

// ── Invoices ───────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  sort_order?: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string | null;
  invoice_number: string;
  status: "draft" | "sent" | "partial" | "paid";
  issue_date?: string | null;
  due_date?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount_rate: number | string;
  discount_amount: number | string;
  retention_rate: number | string;
  retention_amount: number | string;
  cis_rate: number | string;
  cis_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  notes?: string | null;
  terms?: string | null;
  created_at?: string;
  updated_at?: string;
  line_items?: InvoiceLineItem[];
  transactions?: Transaction[];
}

export interface InvoiceInput {
  client_id?: string | null;
  invoice_number?: string;
  status?: "draft" | "sent" | "partial" | "paid";
  issue_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  terms?: string | null;
  tax_rate?: number;
  discount_rate?: number;
  retention_rate?: number;
  cis_rate?: number;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface InvoiceListResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listInvoices(status?: string): Promise<Invoice[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch<InvoiceListResponse>(`/api/invoices${qs}`);
  return res.data || [];
}

export async function getInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${id}`);
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  return apiFetch<Invoice>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput
): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  return apiFetch<void>(`/api/invoices/${id}`, { method: "DELETE" });
}

export async function sendInvoice(id: string): Promise<{ success: boolean; status: string }> {
  return apiFetch<{ success: boolean; status: string }>(`/api/invoices/${id}/send`, {
    method: "POST",
  });
}

export async function markInvoicePaid(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${id}/paid`, { method: "PATCH" });
}

export async function nextInvoiceNumber(
  prefix = "INV",
  autoIncrement = true
): Promise<string> {
  const qs = `?prefix=${encodeURIComponent(prefix)}&autoIncrement=${autoIncrement}`;
  const res = await apiFetch<{ invoiceNumber: string }>(`/api/invoices/next/number${qs}`);
  return res.invoiceNumber;
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  payment_method?: string,
  reference?: string,
  notes?: string
): Promise<unknown> {
  return apiFetch<unknown>(`/api/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify({ amount, payment_method, reference, notes }),
  });
}

// ── Transactions ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  user_id: string;
  invoice_id?: string | null;
  type: "expense" | "payment";
  amount: number | string;
  transaction_date?: string;
  description?: string | null;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface TransactionInput {
  invoice_id?: string | null;
  type: "expense" | "payment";
  amount: number;
  transaction_date?: string;
  description?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listTransactions(type?: string): Promise<Transaction[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const res = await apiFetch<TransactionListResponse>(`/api/transactions${qs}`);
  return res.data || [];
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function getDashboardReport(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/reports/dashboard");
}

export async function getRevenueTrend(
  start?: string,
  end?: string
): Promise<Record<string, unknown>> {
  const qs = start && end ? `?start=${start}&end=${end}` : "";
  return apiFetch<Record<string, unknown>>(`/api/reports/revenue-trend${qs}`);
}

export async function getProfitLoss(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/reports/profit-loss");
}

export async function getReportsSummary(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/reports/summary");
}

export async function getTopExpenses(
  start?: string,
  end?: string
): Promise<Record<string, unknown>[]> {
  const qs = start && end ? `?start=${start}&end=${end}` : "";
  return apiFetch<Record<string, unknown>[]>(`/api/reports/top-expenses${qs}`);
}

export async function getTaxEstimate(
  start?: string,
  end?: string
): Promise<Record<string, unknown>> {
  const qs = start && end ? `?start=${start}&end=${end}` : "";
  return apiFetch<Record<string, unknown>>(`/api/reports/tax-estimate${qs}`);
}

export function getReportExportUrl(
  type: "profit-loss" | "revenue" | "expenses",
  start?: string,
  end?: string
): string {
  const params = new URLSearchParams({ type });
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return `${API_BASE_URL}/api/reports/export?${params.toString()}`;
}

export function getInvoicePdfUrl(id: string): string {
  return `${API_BASE_URL}/api/invoices/${id}/pdf`;
}

// ── Settings / Profile ─────────────────────────────────────────────────────

export interface UserSettings {
  companyName?: string;
  vatNumber?: string;
  address?: Record<string, unknown> | string;
  phone?: string;
  country?: string;
  industry?: string;
  targetMargin?: number;
  vatScheme?: "standard" | "flat-rate" | "cash-accounting";
  reverseCharge?: boolean;
  cis?: boolean;
}

export async function getSettings(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/settings");
}

export async function updateSettings(settings: Record<string, unknown>): Promise<void> {
  return apiFetch<void>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function updateUserProfile(user: Partial<AuthUser>): Promise<AuthUser> {
  const current = getStoredUser();
  if (!current) throw new Error("Not authenticated");
  const next = await apiFetch<AuthUser>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(user),
  });
  setStoredUser(next);
  return next;
}

// ── AI ─────────────────────────────────────────────────────────────────────

export async function aiChat(
  message: string,
  messages?: { role: string; content: string }[]
): Promise<{ reply: string; provider?: string; model?: string }> {
  const res = await apiFetch<{ response: string; provider?: string; model?: string }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, messages }),
  });
  return { reply: res.response || "", provider: res.provider, model: res.model };
}

export async function aiGenerateInvoice(
  description: string
): Promise<{ invoice?: Record<string, unknown>; provider?: string; model?: string }> {
  const res = await apiFetch<{ invoice: Record<string, unknown>; provider?: string; model?: string }>("/api/ai/generate-invoice", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
  return { invoice: res.invoice, provider: res.provider, model: res.model };
}

export async function aiWhoOwesMe(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/ai/who-owes-me");
}

export async function aiTaxAdvice(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/ai/tax-advice");
}

export async function aiSummarizePL(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/ai/summarize-pl");
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  user_id: string;
  client_id?: string | null;
  name: string;
  client_name?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectInput {
  name: string;
  client_id?: string | null;
  client_name?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
}

export interface ProjectListResponse {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProjects(): Promise<Project[]> {
  const res = await apiFetch<ProjectListResponse>("/api/projects");
  return res.data || [];
}

export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProject(
  id: string,
  input: ProjectInput
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

// ── Variations ─────────────────────────────────────────────────────────────

export interface VariationItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
}

export interface Variation {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description?: string | null;
  items?: VariationItem[];
  total: number | string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface VariationInput {
  project_id: string;
  title: string;
  description?: string | null;
  items?: VariationItem[];
  status?: string;
}

export interface VariationListResponse {
  data: Variation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listVariations(
  projectId?: string,
  status?: string
): Promise<Variation[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  if (status) params.set("status", status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch<VariationListResponse>(`/api/variations${qs}`);
  return res.data || [];
}

export async function getVariation(id: string): Promise<Variation> {
  return apiFetch<Variation>(`/api/variations/${id}`);
}

export async function createVariation(input: VariationInput): Promise<Variation> {
  return apiFetch<Variation>("/api/variations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateVariation(
  id: string,
  input: VariationInput
): Promise<Variation> {
  return apiFetch<Variation>(`/api/variations/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteVariation(id: string): Promise<void> {
  return apiFetch<void>(`/api/variations/${id}`, { method: "DELETE" });
}

export async function approveVariation(id: string): Promise<Variation> {
  return apiFetch<Variation>(`/api/variations/${id}/approve`, { method: "POST" });
}

export async function convertVariationToInvoice(
  id: string,
  options?: {
    tax_rate?: number;
    discount_rate?: number;
    retention_rate?: number;
    cis_rate?: number;
    issue_date?: string;
    due_date?: string;
    notes?: string;
    terms?: string;
    prefix?: string;
  }
): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/variations/${id}/convert-to-invoice`, {
    method: "POST",
    body: JSON.stringify(options || {}),
  });
}

// ── Quotes ─────────────────────────────────────────────────────────────────

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  sort_order?: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | string;

export interface Quote {
  id: string;
  user_id: string;
  client_id?: string | null;
  quote_number: string;
  title: string;
  status: QuoteStatus;
  issue_date?: string | null;
  expiry_date?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  subtotal: number | string;
  total: number | string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  items: QuoteLineItem[];
}

export interface QuoteInput {
  client_id?: string | null;
  title: string;
  status?: QuoteStatus;
  items?: QuoteLineItem[];
  notes?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  quote_prefix?: string;
  auto_increment?: boolean;
}

export interface QuoteListResponse {
  data: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listQuotes(status?: string): Promise<Quote[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch<QuoteListResponse>(`/api/quotes${qs}`);
  return res.data || [];
}

export async function getQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/api/quotes/${id}`);
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  return apiFetch<Quote>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateQuote(id: string, input: QuoteInput): Promise<Quote> {
  return apiFetch<Quote>(`/api/quotes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteQuote(id: string): Promise<void> {
  return apiFetch<void>(`/api/quotes/${id}`, { method: "DELETE" });
}

export async function sendQuote(
  id: string
): Promise<{ success: boolean; status: string; email?: { sent: boolean; messageId?: string; error?: string } }> {
  return apiFetch<{ success: boolean; status: string; email?: { sent: boolean; messageId?: string; error?: string } }>(
    `/api/quotes/${id}/send`,
    { method: "POST" }
  );
}

export async function convertQuoteToInvoice(
  id: string,
  options?: { invoice_prefix?: string; auto_increment?: boolean }
): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/quotes/${id}/convert`, {
    method: "POST",
    body: JSON.stringify(options || {}),
  });
}
