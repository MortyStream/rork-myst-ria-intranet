import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://toefttzpdexugvfdqhfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWZ0dHpwZGV4dWd2ZmRxaGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDAwMTcsImV4cCI6MjA5MjE3NjAxN30.h2A3qTRXPkOR8qfQsY6c1pXOzAFAbvKv-6baR4Qm0wg';

let supabaseInstance = null;
let supabaseAdminInstance = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
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

export const testSupabaseConnection = async () => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return { success: !error, error: error?.message };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const syncUserWithSupabase = async (authUser) => {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .upsert({
        supabaseUserId: authUser.id,
        email: authUser.email,
        updatedAt: now,
      }, { onConflict: 'supabaseUserId' })
      .select()
      .single();

    if (error) return { success: false, error: error.message, details: error.details, hint: error.hint, fullError: error };
    return { success: true, user: data, error: null, details: null, hint: null, fullError: null };
  } catch (e) {
    return { success: false, error: e.message, details: null, hint: null, fullError: e };
  }
};

export const checkAndRestoreSession = async () => {
  try {
    const supabase = getSupabase();
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
    await AsyncStorage.removeItem('mysteria-auth-storage');
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
  try { return JSON.stringify(error); } catch { return 'Unknown error'; }
};
