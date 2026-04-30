import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoTrueClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const SUPABASE_URL = 'https://toefttzpdexugvfdqhfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWZ0dHpwZGV4dWd2ZmRxaGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDAwMTcsImV4cCI6MjA5MjE3NjAxN30.h2A3qTRXPkOR8qfQsY6c1pXOzAFAbvKv-6baR4Qm0wg';
const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
const AUTH_STORAGE_KEY = 'mysteria-auth-storage';

let supabaseInstance = null;
let supabaseAdminInstance = null;

// Cache mémoire du token user actif. Mis à jour par cacheAccessToken() après
// signInWithPassword/setSession pour éviter de dépendre de getSession() qui
// peut être async-instable juste après un login (le client GoTrueClient ne
// propage pas toujours sa session immédiatement vers AsyncStorage).
let _cachedAccessToken = null;

export const cacheAccessToken = (token) => {
  _cachedAccessToken = token ?? null;
};

export const getCachedAccessToken = () => _cachedAccessToken;

const authStorage = {
  getItem: async (key) => {
    const value = await AsyncStorage.getItem(key);
    return value;
  },
  setItem: async (key, value) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    await AsyncStorage.removeItem(key);
  },
};

const createAuthClient = () => {
  return new GoTrueClient({
    url: SUPABASE_AUTH_URL,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    storage: authStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  });
};

const createPostgrestClient = (authClient) => {
  return new PostgrestClient(SUPABASE_REST_URL, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    fetch: async (input, init) => {
      // Priorité au token caché en mémoire (mis à jour synchrone par
      // cacheAccessToken au login). Fallback vers getSession() si besoin.
      let accessToken = _cachedAccessToken;
      if (!accessToken) {
        try {
          const { data } = await authClient.getSession();
          accessToken = data?.session?.access_token ?? null;
          if (accessToken) _cachedAccessToken = accessToken;
        } catch {
          // ignore
        }
      }
      const headers = new Headers(init?.headers ?? {});
      headers.set('apikey', SUPABASE_ANON_KEY);
      headers.set('Authorization', `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`);
      return fetch(input, { ...init, headers });
    },
  });
};

const createStorageClient = (authClient) => {
  const storageUrl = `${SUPABASE_URL}/storage/v1`;

  const getAuthHeaders = async () => {
    let token = _cachedAccessToken;
    if (!token) {
      try {
        const { data } = await authClient.getSession();
        token = data?.session?.access_token ?? null;
        if (token) _cachedAccessToken = token;
      } catch {
        // ignore
      }
    }
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    };
  };

  return {
    from: (bucket) => ({
      upload: async (path, file, options = {}) => {
        try {
          const headers = await getAuthHeaders();
          const contentType = options.contentType ?? 'application/octet-stream';
          const url = `${storageUrl}/object/${bucket}/${path}`;
          const method = options.upsert ? 'PUT' : 'POST';

          const response = await fetch(url, {
            method,
            headers: {
              ...headers,
              'Content-Type': contentType,
              'x-upsert': options.upsert ? 'true' : 'false',
            },
            body: file,
          });

          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { data: null, error: json };
          }
          return { data: json, error: null };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      },

      getPublicUrl: (path) => {
        return {
          data: {
            publicUrl: `${storageUrl}/object/public/${bucket}/${path}`,
          },
        };
      },

      remove: async (paths) => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(`${storageUrl}/object/${bucket}`, {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefixes: paths }),
          });
          const json = await response.json().catch(() => ({}));
          if (!response.ok) return { data: null, error: json };
          return { data: json, error: null };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      },
    }),
  };
};

const createSupabaseLikeClient = () => {
  const auth = createAuthClient();
  const postgrest = createPostgrestClient(auth);
  const storage = createStorageClient(auth);

  return {
    auth,
    storage,
    from: (table) => postgrest.from(table),
    schema: (schema) => postgrest.schema(schema),
    rpc: (fn, args, options) => postgrest.rpc(fn, args, options),
  };
};

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseLikeClient();
  }

  return supabaseInstance;
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createSupabaseLikeClient();
  }

  return supabaseAdminInstance;
};

export const reinitializeSupabase = () => {
  supabaseInstance = null;
  supabaseAdminInstance = null;
  getSupabase();
  getSupabaseAdmin();
  return true;
};

export const syncUserWithSupabase = async (authUser) => {
  // Best-effort : on cherche d'abord la row existante par supabaseUserId.
  // - Si trouvée → on update juste updatedAt (rapide, pas de WITH CHECK strict).
  // - Si pas trouvée → on n'INSERT PAS (les profils sont créés par les admins,
  //   pas auto-créés au login). Le login function gère le cas "user pas lié"
  //   avec un fallback par email.
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // 1. Cherche la row par supabaseUserId
    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('supabaseUserId', authUser.id)
      .maybeSingle();

    if (lookupErr) {
      // Probablement RLS / JWT pas encore propagé. Non-bloquant.
      return {
        success: false,
        error: lookupErr.message,
        details: lookupErr.details,
        hint: lookupErr.hint,
        fullError: lookupErr,
      };
    }

    if (!existing) {
      // Pas de profil pour cet auth user → on retourne en non-bloquant.
      // Le fallback dans login() retentera de lier par email après que la session soit settled.
      return {
        success: false,
        error: 'No profile linked yet (will retry via email fallback)',
        details: null,
        hint: null,
        fullError: null,
      };
    }

    // 2. Update du updatedAt (touch — montre que l'user s'est connecté récemment)
    const { data, error: updateErr } = await supabase
      .from('users')
      .update({ updatedAt: now })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message,
        details: updateErr.details,
        hint: updateErr.hint,
        fullError: updateErr,
      };
    }

    return {
      success: true,
      user: data,
      error: null,
      details: null,
      hint: null,
      fullError: null,
    };
  } catch (e) {
    return {
      success: false,
      error: e?.message ?? 'Unknown error',
      details: null,
      hint: null,
      fullError: e,
    };
  }
};

export const checkAndRestoreSession = async () => {
  try {
    const supabase = getSupabase();
    await supabase.auth.initialize();
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  } catch {
    return null;
  }
};

export const testAuth = async () => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    return !!data?.user;
  } catch {
    return false;
  }
};

export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const formatSupabaseError = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error?.message === 'string') return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};
