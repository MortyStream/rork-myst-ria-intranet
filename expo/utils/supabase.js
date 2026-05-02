// Client Supabase custom — POURQUOI on n'utilise PAS @supabase/supabase-js.
//
// On assemble nous-mêmes GoTrueClient (auth) + PostgrestClient (DB) +
// RealtimeClient (WS) + un wrapper Storage maison. Ce choix répond à 3 besoins :
//
// 1. Cache JWT mémoire (_cachedAccessToken) propagé synchroniquement après
//    signInWithPassword. Le SDK officiel s'appuie sur getSession() qui peut
//    retourner null pendant 50-200ms post-login (timing AsyncStorage), ce
//    qui causait des "user fantôme" et toutes les pages vides après login
//    (cf. CLAUDE.md Hard Lesson 5.2).
// 2. Contrôle total des headers de chaque fetch (Authorization, apikey).
// 3. Bundle size réduit (on n'embarque pas tout le SDK).
//
// NE PAS "simplifier" en revenant au SDK officiel sans avoir une vraie
// alternative testée pour la propagation JWT. Le bug est très subtil et
// n'apparaît que dans certaines conditions de timing — facile à rater.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoTrueClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { RealtimeClient } from '@supabase/realtime-js';

const SUPABASE_URL = 'https://toefttzpdexugvfdqhfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWZ0dHpwZGV4dWd2ZmRxaGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDAwMTcsImV4cCI6MjA5MjE3NjAxN30.h2A3qTRXPkOR8qfQsY6c1pXOzAFAbvKv-6baR4Qm0wg';
const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_REALTIME_URL = `${SUPABASE_URL.replace('https://', 'wss://')}/realtime/v1`;
const AUTH_STORAGE_KEY = 'mysteria-auth-storage';

let supabaseInstance = null;
let supabaseAdminInstance = null;
let realtimeClientInstance = null;

// Cache mémoire du token user actif. Mis à jour par cacheAccessToken() après
// signInWithPassword/setSession pour éviter de dépendre de getSession() qui
// peut être async-instable juste après un login (le client GoTrueClient ne
// propage pas toujours sa session immédiatement vers AsyncStorage).
let _cachedAccessToken = null;

export const cacheAccessToken = (token) => {
  _cachedAccessToken = token ?? null;
  // Propage le JWT au RealtimeClient si déjà instancié → les souscriptions WS
  // utiliseront le token user (et donc respecteront RLS) au lieu du anon_key.
  // Au logout (token=null), on retombe sur l'anon_key.
  if (realtimeClientInstance) {
    try {
      realtimeClientInstance.setAuth(token ?? SUPABASE_ANON_KEY);
    } catch (e) {
      console.log('[Realtime] setAuth on cache update failed:', e?.message);
    }
  }
};

export const getCachedAccessToken = () => _cachedAccessToken;

/**
 * RealtimeClient lazy. Une seule instance pour toute l'app.
 * setAuth est appelé au login (via cacheAccessToken) pour que les souscriptions
 * WebSocket envoient le JWT user → RLS s'applique correctement.
 */
const getRealtimeClient = () => {
  if (!realtimeClientInstance) {
    realtimeClientInstance = new RealtimeClient(SUPABASE_REALTIME_URL, {
      params: {
        apikey: SUPABASE_ANON_KEY,
        eventsPerSecond: 10,
      },
    });
    // Si on a déjà un token (app rouverte avec session persistée), l'envoie tout de suite
    if (_cachedAccessToken) {
      try {
        realtimeClientInstance.setAuth(_cachedAccessToken);
      } catch (e) {
        console.log('[Realtime] setAuth init failed:', e?.message);
      }
    }
  }
  return realtimeClientInstance;
};

/**
 * Souscrit aux INSERT / UPDATE / DELETE sur la table `tasks` (toutes rows).
 * Utilisé pour garder la liste des tâches du store sync en temps réel — quand
 * un user crée une tâche pour quelqu'un d'autre, elle pop sans refresh.
 *
 * RLS s'applique : on ne reçoit que les rows que le user a le droit de SELECT.
 *
 * @param {{ onInsert?: (row: any) => void, onUpdate?: (row: any) => void, onDelete?: (row: any) => void }} handlers
 * @returns {() => void} cleanup function
 */
export const subscribeToTasksList = ({ onInsert, onUpdate, onDelete }) => {
  let cancelled = false;
  let cleanup = null;

  (async () => {
    if (!_cachedAccessToken) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) cacheAccessToken(token);
      } catch {
        // Best-effort
      }
    }

    if (cancelled) return;

    const realtime = getRealtimeClient();
    const channel = realtime.channel('tasks:list');

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => { try { if (payload?.new && onInsert) onInsert(payload.new); } catch (e) { console.log('[Realtime] tasks:list INSERT cb error:', e?.message); } }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => { try { if (payload?.new && onUpdate) onUpdate(payload.new); } catch (e) { console.log('[Realtime] tasks:list UPDATE cb error:', e?.message); } }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => { try { if (payload?.old && onDelete) onDelete(payload.old); } catch (e) { console.log('[Realtime] tasks:list DELETE cb error:', e?.message); } }
      )
      .subscribe((status) => {
        console.log('[Realtime] tasks:list →', status);
      });

    cleanup = () => {
      try { channel.unsubscribe(); } catch (e) { console.log('[Realtime] tasks:list unsubscribe error:', e?.message); }
    };
  })();

  return () => {
    cancelled = true;
    if (cleanup) cleanup();
  };
};

/**
 * Souscrit aux events broadcast `typing` sur une tâche donnée.
 * Broadcast = WS éphémère, pas de persistance DB. Utilisé pour les indicateurs
 * "X est en train d'écrire..." live entre 2 users qui ont la même task ouverte.
 *
 * Renvoie :
 *  - `sendTyping(payload)` : émet un broadcast `typing` (le sender reçoit pas grâce à `self:false`)
 *  - `unsubscribe()` : cleanup au unmount
 *
 * @param {string} taskId
 * @param {{ onTyping: (payload: any) => void }} handlers
 */
export const subscribeToTaskTyping = (taskId, { onTyping }) => {
  if (!taskId) return { sendTyping: () => {}, unsubscribe: () => {} };

  let cancelled = false;
  let channel = null;
  let cleanup = null;

  (async () => {
    if (!_cachedAccessToken) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) cacheAccessToken(token);
      } catch {
        // Best-effort
      }
    }

    if (cancelled) return;

    const realtime = getRealtimeClient();
    channel = realtime.channel(`tasks-typing:${taskId}`, {
      config: { broadcast: { self: false } }, // pas d'echo au sender
    });

    channel
      .on('broadcast', { event: 'typing' }, (msg) => {
        try {
          if (msg?.payload && onTyping) onTyping(msg.payload);
        } catch (e) {
          console.log('[Realtime] typing cb error:', e?.message);
        }
      })
      .subscribe((status) => {
        console.log(`[Realtime] tasks-typing:${taskId} →`, status);
      });

    cleanup = () => {
      try { channel.unsubscribe(); } catch (e) { console.log('[Realtime] typing unsub error:', e?.message); }
    };
  })();

  return {
    sendTyping: (payload) => {
      if (!channel) return;
      try {
        channel.send({ type: 'broadcast', event: 'typing', payload });
      } catch (e) {
        console.log('[Realtime] sendTyping error:', e?.message);
      }
    },
    unsubscribe: () => {
      cancelled = true;
      if (cleanup) cleanup();
    },
  };
};

/**
 * Souscrit aux UPDATE de la row `tasks` pour un taskId donné.
 * Le callback reçoit la row complète (REPLICA IDENTITY FULL côté DB).
 * Retourne une fonction de cleanup à appeler au unmount.
 *
 * Async-safe : si _cachedAccessToken n'est pas encore peuplé (cas app rouverte
 * avec session persistée mais cacheAccessToken pas encore appelé), on récupère
 * la session avant de subscribe — sinon le channel s'auth en anon, RLS bloque
 * et on ne reçoit aucun event (=fail silencieux).
 *
 * @param {string} taskId
 * @param {(updatedRow: any) => void} onUpdate
 * @returns {() => void}
 */
export const subscribeToTask = (taskId, onUpdate) => {
  if (!taskId) return () => {};

  let cancelled = false;
  let cleanup = null;

  (async () => {
    // 1. Garantir un JWT user pour le WS (sinon RLS bloque les events)
    if (!_cachedAccessToken) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) cacheAccessToken(token); // propage aussi à realtime via setAuth
      } catch {
        // Best-effort, on continue (le channel échouera proprement si pas auth)
      }
    }

    if (cancelled) return;

    const realtime = getRealtimeClient();
    // Channel unique par task → isolation des flows de souscription
    const channel = realtime.channel(`tasks:${taskId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          try {
            if (payload?.new) onUpdate(payload.new);
          } catch (e) {
            console.log('[Realtime] task callback error:', e?.message);
          }
        }
      )
      .subscribe((status) => {
        // status possibles : 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
        console.log(`[Realtime] tasks:${taskId} →`, status);
      });

    cleanup = () => {
      try {
        channel.unsubscribe();
      } catch (e) {
        console.log('[Realtime] unsubscribe error:', e?.message);
      }
    };
  })();

  return () => {
    cancelled = true;
    if (cleanup) cleanup();
  };
};

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
