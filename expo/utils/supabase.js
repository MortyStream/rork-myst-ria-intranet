import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/store/settings-store';

let supabaseInstance = null;
let supabaseAdminInstance = null;

const formatSupabaseError = (error) => {
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

const createResponse = (data = null, error = null, count = null) => ({ data, error, count });

const createSingleResponse = (record = null) => {
  if (record) {
    return createResponse(record, null);
  }

  return createResponse(null, { code: 'PGRST116', message: 'No rows found in preview mode' });
};

const createChain = (tableName) => {
  const state = {
    tableName,
    filters: [],
    payload: null,
    action: 'select',
  };

  const chain = {
    select: async (_columns, options) => {
      console.log('[Preview Supabase] select', tableName, options ?? null);
      if (options?.head && options?.count) {
        return createResponse(null, null, 0);
      }
      return createResponse([], null);
    },
    insert(payload) {
      console.log('[Preview Supabase] insert', tableName, payload);
      state.action = 'insert';
      state.payload = payload;
      return chain;
    },
    update(payload) {
      console.log('[Preview Supabase] update', tableName, payload);
      state.action = 'update';
      state.payload = payload;
      return chain;
    },
    delete() {
      console.log('[Preview Supabase] delete', tableName);
      state.action = 'delete';
      return chain;
    },
    upsert(payload) {
      console.log('[Preview Supabase] upsert', tableName, payload);
      state.action = 'upsert';
      state.payload = payload;
      return chain;
    },
    eq(column, value) {
      state.filters.push({ type: 'eq', column, value });
      return chain;
    },
    neq(column, value) {
      state.filters.push({ type: 'neq', column, value });
      return chain;
    },
    in(column, value) {
      state.filters.push({ type: 'in', column, value });
      return chain;
    },
    order(column, options) {
      state.filters.push({ type: 'order', column, options });
      return chain;
    },
    limit(value) {
      state.filters.push({ type: 'limit', value });
      return chain;
    },
    maybeSingle: async () => {
      console.log('[Preview Supabase] maybeSingle', tableName, state);
      if (state.action === 'insert') {
        const inserted = Array.isArray(state.payload) ? state.payload[0] : state.payload;
        return createResponse(inserted ?? null, null);
      }
      return createResponse(null, null);
    },
    single: async () => {
      console.log('[Preview Supabase] single', tableName, state);
      if (state.action === 'insert') {
        const inserted = Array.isArray(state.payload) ? state.payload[0] : state.payload;
        return createResponse(inserted ?? null, null);
      }
      if (state.action === 'update') {
        return createResponse(state.payload ?? null, null);
      }
      return createSingleResponse(null);
    },
    then(onFulfilled, onRejected) {
      const response = state.action === 'delete'
        ? createResponse([], null)
        : state.action === 'insert'
          ? createResponse(Array.isArray(state.payload) ? state.payload : [state.payload], null)
          : state.action === 'update'
            ? createResponse(Array.isArray(state.payload) ? state.payload : [state.payload], null)
            : createResponse([], null);

      return Promise.resolve(response).then(onFulfilled, onRejected);
    },
  };

  return chain;
};

const createPreviewClient = (mode) => ({
  __preview: true,
  __mode: mode,
  from(tableName) {
    console.log(`[Preview Supabase:${mode}] from`, tableName);
    return createChain(tableName);
  },
  rpc: async (name, params) => {
    console.log(`[Preview Supabase:${mode}] rpc`, name, params ?? null);
    return createResponse(null, null);
  },
  auth: {
    getSession: async () => {
      console.log(`[Preview Supabase:${mode}] auth.getSession`);
      return createResponse({ session: null }, null);
    },
    refreshSession: async () => {
      console.log(`[Preview Supabase:${mode}] auth.refreshSession`);
      return createResponse({ session: null }, null);
    },
    getUser: async () => {
      console.log(`[Preview Supabase:${mode}] auth.getUser`);
      return createResponse({ user: null }, null);
    },
    signInWithPassword: async (credentials) => {
      console.log(`[Preview Supabase:${mode}] auth.signInWithPassword`, credentials?.email ?? 'unknown');
      return createResponse(
        { user: null, session: null },
        { message: 'Connexion désactivée en mode preview' },
      );
    },
    signOut: async () => {
      console.log(`[Preview Supabase:${mode}] auth.signOut`);
      return createResponse(null, null);
    },
    resetPasswordForEmail: async (email) => {
      console.log(`[Preview Supabase:${mode}] auth.resetPasswordForEmail`, email);
      return createResponse(null, null);
    },
    updateUser: async (payload) => {
      console.log(`[Preview Supabase:${mode}] auth.updateUser`, payload ?? null);
      return createResponse({ user: null }, null);
    },
    admin: {
      createUser: async (payload) => {
        console.log(`[Preview Supabase:${mode}] auth.admin.createUser`, payload?.email ?? 'unknown');
        return createResponse({ user: null }, null);
      },
    },
  },
  storage: {
    from(bucket) {
      console.log(`[Preview Supabase:${mode}] storage.from`, bucket);
      return {
        upload: async (path) => {
          console.log(`[Preview Supabase:${mode}] storage.upload`, bucket, path);
          return createResponse({ path }, null);
        },
        getPublicUrl: (path) => {
          console.log(`[Preview Supabase:${mode}] storage.getPublicUrl`, bucket, path);
          return { data: { publicUrl: '' } };
        },
      };
    },
  },
});

export const getSupabase = () => {
  if (!supabaseInstance) {
    const { supabaseUrl } = useSettingsStore.getState();
    console.log('[Preview Supabase] Initializing client with URL:', supabaseUrl || 'missing');
    supabaseInstance = createPreviewClient('client');
  }

  return supabaseInstance;
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const { supabaseUrl } = useSettingsStore.getState();
    console.log('[Preview Supabase] Initializing admin client with URL:', supabaseUrl || 'missing');
    supabaseAdminInstance = createPreviewClient('admin');
  }

  return supabaseAdminInstance;
};

export const reinitializeSupabase = () => {
  console.log('[Preview Supabase] Reinitializing clients');
  supabaseInstance = null;
  supabaseAdminInstance = null;
  getSupabase();
  getSupabaseAdmin();
  return true;
};

export const testSupabaseConnection = async () => {
  console.log('[Preview Supabase] testSupabaseConnection');
  return { success: true };
};

export const syncUserWithSupabase = async (authUser) => {
  console.log('[Preview Supabase] syncUserWithSupabase', authUser?.id ?? 'missing');
  return {
    success: true,
    user: authUser ?? null,
    error: null,
    details: null,
    hint: null,
    fullError: null,
  };
};

export const checkAndRestoreSession = async () => {
  console.log('[Preview Supabase] checkAndRestoreSession');
  const stored = await AsyncStorage.getItem('mysteria-auth-storage');
  console.log('[Preview Supabase] Stored auth snapshot present:', Boolean(stored));
  return null;
};

export const testAuth = async () => {
  console.log('[Preview Supabase] testAuth');
  return false;
};

export const clearAuthData = async () => {
  console.log('[Preview Supabase] clearAuthData');
  await AsyncStorage.removeItem('mysteria-auth-storage');
  return true;
};

export { formatSupabaseError };
