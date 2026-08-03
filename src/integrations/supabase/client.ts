// Auth compatibility shim for the InvoiceSmart Express backend.
// The original app used Supabase auth; this file preserves the import path and
// exposes a minimal supabase.auth API backed by the local InvoiceSmart API.
// Data tables that now have real InvoiceSmart endpoints (clients, projects,
// quotes, variations) are no longer stubbed; calling them throws so code
// migrates to @/lib/invoicesmart. Remaining Supabase surfaces (storage,
// realtime, edge functions, and any other tables) are still stubbed.

import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  register,
  login,
  getMe,
  type AuthUser,
} from "@/lib/invoicesmart";

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "INITIAL_SESSION";
type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

interface Session {
  user: AuthUser;
  access_token: string;
}

const listeners = new Set<AuthListener>();

function buildSession(): Session | null {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) return null;
  return { user, access_token: token };
}

function emit(event: AuthChangeEvent, session: Session | null) {
  listeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}

async function refreshUser() {
  const token = getToken();
  if (!token) return;
  try {
    const user = await getMe();
    setStoredUser(user);
  } catch (err) {
    // If the token is invalid, clear it.
    clearToken();
    emit("SIGNED_OUT", null);
  }
}

// Initialise session on import (matches original Supabase localStorage persistence).
refreshUser().then(() => {
  emit("INITIAL_SESSION", buildSession());
});

const auth = {
  async signUp({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: {
      emailRedirectTo?: string;
      data?: { first_name?: string; last_name?: string; company_name?: string };
    };
  }) {
    const res = await register({
      email,
      password,
      first_name: options?.data?.first_name,
      last_name: options?.data?.last_name,
      company_name: options?.data?.company_name,
    });
    setToken(res.token);
    setStoredUser(res.user);
    emit("SIGNED_IN", buildSession());
    return { data: { user: res.user, session: buildSession() }, error: null };
  },

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const res = await login({ email, password });
    setToken(res.token);
    setStoredUser(res.user);
    emit("SIGNED_IN", buildSession());
    return { data: { user: res.user, session: buildSession() }, error: null };
  },

  async signOut() {
    clearToken();
    emit("SIGNED_OUT", null);
    return { error: null };
  },

  async getSession() {
    const session = buildSession();
    if (session) {
      // Refresh profile in the background to keep stored user in sync.
      refreshUser().catch(() => {});
    }
    return { data: { session } };
  },

  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    // Supabase convention: immediately fire current state.
    callback("INITIAL_SESSION", buildSession());
    return {
      data: {
        subscription: {
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  },
};

// Tables that now have real InvoiceSmart REST endpoints. These stubs are removed
// so any remaining Supabase-form calls fail loudly instead of silently returning
// empty data that masks missing integration.
const SHADOWED_TABLES = new Set(["clients", "projects", "quotes", "variations"]);

function removedTableError(table: string): never {
  throw new Error(
    `Supabase table "${table}" is no longer available; use the InvoiceSmart API from @/lib/invoicesmart instead.`
  );
}

// Stub for remaining non-auth Supabase surfaces (storage, realtime, edge
// functions, and any tables not yet migrated). Returning empty results lets
// components that still import these surfaces render gracefully.
const stubData = {
  from: (table: string) => {
    if (SHADOWED_TABLES.has(table)) {
      return removedTableError(table);
    }
    return {
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    };
  },
  rpc: () => Promise.resolve({ data: null, error: null }),
};

const stubFunctions = {
  invoke: () => Promise.resolve({ data: null, error: null }),
};

// Minimal Supabase-like client. The auth property is real. Data tables that have
// InvoiceSmart endpoints throw on access; remaining Supabase surfaces still
// return empty stub results.
export const supabase = {
  auth,
  from: stubData.from,
  rpc: stubData.rpc,
  functions: stubFunctions,
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
  }),
  removeChannel: () => {},
};

export default supabase;
