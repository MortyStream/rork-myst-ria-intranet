import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { useSettingsStore } from '@/store/settings-store';

// Initialize Supabase client
let supabaseInstance = null;
let supabaseAdminInstance = null;

// Helper function to format Supabase errors
const formatSupabaseError = (error) => {
  if (!error) return 'Unknown error';
  
  // If error is already a string, return it
  if (typeof error === 'string') return error;
  
  // Format PostgreSQL error
  if (error.code && error.message) {
    return `${error.message} (Code: ${error.code})${error.hint ? ` Hint: ${error.hint}` : ''}`;
  }
  
  // Format other errors
  return error.message || JSON.stringify(error);
};

// Function to get or create the Supabase client
export const getSupabase = () => {
  if (!supabaseInstance) {
    // Get Supabase configuration from settings store
    const { supabaseUrl, supabaseKey } = useSettingsStore.getState();
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key is missing');
      throw new Error('Supabase configuration is missing');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
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

// Function to get or create the Supabase admin client
export const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const { supabaseUrl, supabaseKey } = useSettingsStore.getState();
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key is missing');
      throw new Error('Supabase configuration is missing');
    }
    
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey, {
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

// Function to reinitialize Supabase clients
export const reinitializeSupabase = () => {
  console.log('Reinitializing Supabase clients...');
  
  const { supabaseUrl, supabaseKey } = useSettingsStore.getState();
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Cannot reinitialize: Supabase URL or key is missing');
    return false;
  }
  
  try {
    supabaseInstance = null;
    supabaseAdminInstance = null;
    getSupabase();
    getSupabaseAdmin();
    console.log('Supabase clients reinitialized successfully');
    return true;
  } catch (error) {
    console.error('Error reinitializing Supabase:', formatSupabaseError(error));
    return false;
  }
};

// Function to test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', formatSupabaseError(error));
      return { success: false, error: formatSupabaseError(error) };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Supabase connection test error:', formatSupabaseError(error));
    return { success: false, error: formatSupabaseError(error) };
  }
};

// Function to sync user with Supabase
export const syncUserWithSupabase = async (authUser) => {
  if (!authUser?.id) {
    console.error('No auth user ID provided for sync');
    return { 
      success: false, 
      error: 'No auth user ID provided',
      details: null,
      hint: 'Make sure user is authenticated'
    };
  }
  
  try {
    console.log('Syncing user:', authUser.id);
    const supabase = getSupabase();
    
    // First check if user exists in users table
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('supabaseUserId', authUser.id)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user:', formatSupabaseError(findError));
      return { 
        success: false, 
        error: formatSupabaseError(findError),
        details: findError.details,
        hint: findError.hint
      };
    }
    
    // If user exists, update last login
    if (existingUser) {
      console.log('Updating existing user:', existingUser.id);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('Error updating user:', formatSupabaseError(updateError));
        return { 
          success: false, 
          error: formatSupabaseError(updateError),
          details: updateError.details,
          hint: updateError.hint
        };
      }
      
      return { success: true, user: existingUser };
    }
    
    // If no user found, create new user
    console.log('Creating new user for:', authUser.id);
    
    const newUser = {
      supabaseUserId: authUser.id,
      email: authUser.email,
      firstName: authUser.user_metadata?.firstName || '',
      lastName: authUser.user_metadata?.lastName || '',
      role: authUser.user_metadata?.role || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', formatSupabaseError(createError));
      return { 
        success: false, 
        error: formatSupabaseError(createError),
        details: createError.details,
        hint: createError.hint
      };
    }
    
    return { success: true, user: createdUser };
  } catch (error) {
    console.error('Error in syncUserWithSupabase:', formatSupabaseError(error));
    return { 
      success: false, 
      error: formatSupabaseError(error),
      details: error.details || null,
      hint: error.hint || 'Check server logs for more details'
    };
  }
};

// Function to check and restore session
export const checkAndRestoreSession = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', formatSupabaseError(error));
      return null;
    }
    
    if (data.session) {
      console.log('Session found and restored');
      return data.session;
    } else {
      console.log('No active session found');
      return null;
    }
  } catch (error) {
    console.error('Error in checkAndRestoreSession:', formatSupabaseError(error));
    return null;
  }
};

// Function to test authentication
export const testAuth = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth test failed:', formatSupabaseError(error));
      return false;
    }
    
    if (data.user) {
      console.log('Auth test successful, user found:', data.user.id);
      return true;
    }
    
    console.log('Auth test: No user logged in');
    return false;
  } catch (error) {
    console.error('Error in testAuth:', formatSupabaseError(error));
    return false;
  }
};

// Function to clear authentication data
export const clearAuthData = async () => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error clearing auth data:', formatSupabaseError(error));
      return false;
    }
    
    console.log('Auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('Error in clearAuthData:', formatSupabaseError(error));
    return false;
  }
};