import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User, AuthState } from '@/types/user';
import { getSupabase, syncUserWithSupabase } from '@/utils/supabase';

// Admin user for initial setup - removed special role assignment
const DEFAULT_ADMIN: User = {
  id: 'admin-id',
  username: 'admin',
  email: 'kevin.perret@mysteriaevent.ch',
  firstName: 'Kévin',
  lastName: 'Perret',
  role: 'user', // Changed from 'admin' to 'user' to avoid hardcoding special roles
  permissions: ['all'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Moderator user for testing
const DEFAULT_MODERATOR: User = {
  id: 'moderator-id',
  username: 'moderator',
  email: 'moderator@mysteriaevent.ch',
  firstName: 'Modérateur',
  lastName: 'Test',
  role: 'moderator',
  permissions: ['manage_users', 'manage_content'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const PREVIEW_USER: User = {
  id: 'preview-user',
  username: 'preview',
  email: 'preview@mysteriaevent.local',
  firstName: 'Mode',
  lastName: 'Preview',
  role: 'admin',
  permissions: ['all'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  editable: true,
};

const createPreviewUser = (): User => ({
  ...PREVIEW_USER,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const enablePreviewMode = (
  set: (partial: Partial<AuthStore>) => void,
  reason: string,
): boolean => {
  const previewUser = createPreviewUser();

  console.log(`Preview mode enabled: ${reason}`);
  set({
    user: previewUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });

  return true;
};

interface AuthStore extends AuthState {
  user: User | null; // Explicitly adding user property to fix TypeScript error
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  resetPassword: (email: string) => Promise<void>;
  isFirstLogin: boolean;
  setFirstLoginComplete: () => void;
  checkSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  ensureSupabaseReady: () => Promise<boolean>;
  initializeAuth: () => Promise<boolean>;
  initializationAttempts: number;
  incrementInitAttempts: () => void;
  resetInitAttempts: () => void;
  lastInitializationTime: number | null;
  setLastInitializationTime: (time: number) => void;
  initializationStatus: 'idle' | 'initializing' | 'success' | 'error';
  setInitializationStatus: (status: 'idle' | 'initializing' | 'success' | 'error') => void;
  // Store credentials for auto-login after refresh
  storedCredentials: { username: string; password: string } | null;
  setStoredCredentials: (credentials: { username: string; password: string } | null) => void;
  // Timeout tracking
  initializationTimeout: boolean;
  setInitializationTimeout: (timeout: boolean) => void;
  // Hard reset function
  hardReset: () => Promise<void>;
  // Sync user with Supabase
  syncUserWithSupabase: () => Promise<boolean>;
  // Link user profile with Supabase auth user
  linkUserProfileWithSupabaseAuth: (authUserId: string, userEmail: string) => Promise<boolean>;
  // Refresh user data from database
  refreshUserData: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: createPreviewUser(),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isFirstLogin: true,
      initializationAttempts: 0,
      lastInitializationTime: null,
      initializationStatus: 'idle',
      storedCredentials: null,
      initializationTimeout: false,
      
      setInitializationStatus: (status) => {
        set({ initializationStatus: status });
      },
      
      setLastInitializationTime: (time) => {
        set({ lastInitializationTime: time });
      },
      
      incrementInitAttempts: () => {
        set(state => ({ initializationAttempts: state.initializationAttempts + 1 }));
      },
      
      resetInitAttempts: () => {
        set({ initializationAttempts: 0 });
      },
      
      setStoredCredentials: (credentials) => {
        set({ storedCredentials: credentials });
      },
      
      setInitializationTimeout: (timeout) => {
        set({ initializationTimeout: timeout });
      },
      
      hardReset: async () => {
        console.log('Performing hard reset of auth system...');
        
        // Reset all state
        set({ 
          user: createPreviewUser(), 
          isAuthenticated: true,
          error: null,
          initializationAttempts: 0,
          lastInitializationTime: null,
          initializationStatus: 'idle',
          initializationTimeout: false,
          storedCredentials: null
        });
        
        console.log('Hard reset completed');
      },
      
      // New function to refresh user data from database
      refreshUserData: async () => {
        console.log('Refreshing user data from database...');
        
        try {
          const currentUser = get().user;
          if (!currentUser || !currentUser.supabaseUserId) {
            console.error('No current user or supabaseUserId to refresh');
            return false;
          }
          
          const supabase = getSupabase();
          
          // First try to get user from users table by supabaseUserId
          console.log(`Fetching fresh user data for supabaseUserId: ${currentUser.supabaseUserId}`);
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('supabaseUserId', currentUser.supabaseUserId)
            .single();
          
          if (userError && userError.code !== 'PGRST116') { // Not found is ok
            console.error('Error fetching user data by supabaseUserId:', userError);
            console.error('Full error object:', JSON.stringify(userError, null, 2));
          }
          
          // If not found by supabaseUserId, try by email
          let freshUserData = userData;
          if (!freshUserData && currentUser.email) {
            console.log(`Fetching fresh user data for email: ${currentUser.email}`);
            const { data: emailUserData, error: emailUserError } = await supabase
              .from('users')
              .select('*')
              .eq('email', currentUser.email)
              .single();
            
            if (emailUserError && emailUserError.code !== 'PGRST116') { // Not found is ok
              console.error('Error fetching user data by email:', emailUserError);
              console.error('Full error object:', JSON.stringify(emailUserError, null, 2));
            }
            
            freshUserData = emailUserData;
          }
          
          // If still not found, try directory_profiles
          if (!freshUserData && currentUser.email) {
            console.log(`Checking directory_profiles for email: ${currentUser.email}`);
            const { data: directoryData, error: directoryError } = await supabase
              .from('directory_profiles')
              .select('*')
              .eq('email', currentUser.email)
              .single();
            
            if (directoryError && directoryError.code !== 'PGRST116') { // Not found is ok
              console.error('Error fetching directory profile:', directoryError);
              console.error('Full error object:', JSON.stringify(directoryError, null, 2));
            }
            
            freshUserData = directoryData;
          }
          
          // Add detailed logging of the fetched profile
          console.log('Fetched profile from Supabase:', JSON.stringify(freshUserData, null, 2));
          
          if (freshUserData) {
            console.log('Fresh user data found:', JSON.stringify(freshUserData, null, 2));
            
            // Log the role from the database for debugging
            console.log('User role from database:', freshUserData.role);
            console.log('Current user role in memory:', currentUser.role);
            
            // Update the user object with fresh data, prioritizing database values
            const updatedUser: User = {
              ...currentUser,
              // Always use database values for these fields
              role: freshUserData.role || currentUser.role,
              firstName: freshUserData.firstName || currentUser.firstName,
              lastName: freshUserData.lastName || currentUser.lastName,
              permissions: freshUserData.permissions || currentUser.permissions,
              profileImage: freshUserData.avatarUrl || currentUser.profileImage,
              phone: freshUserData.phone || currentUser.phone,
              bio: freshUserData.bio || currentUser.bio,
              updatedAt: new Date().toISOString(),
            };
            
            // Log the final role that will be used in the app
            console.log("Role used in app:", updatedUser.role);
            
            console.log('Updated user with fresh data. New role:', updatedUser.role);
            set({ user: updatedUser });
            return true;
          } else {
            console.log('No fresh user data found in database');
            return false;
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return false;
        }
      },
      
      // New function to link user profile with Supabase auth user
      linkUserProfileWithSupabaseAuth: async (authUserId, userEmail) => {
        console.log(`Linking user profile with Supabase auth user: ${authUserId}, email: ${userEmail}`);
        
        try {
          const supabase = getSupabase();
          
          // First, check if there's already a user profile with this email
          const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single();
          
          if (findError && findError.code !== 'PGRST116') { // Not found is ok
            console.error('Error finding user profile:', findError);
            console.error('Full error object:', JSON.stringify(findError, null, 2));
            return false;
          }
          
          if (existingUser) {
            // User profile exists, check if it already has a supabaseUserId
            if (existingUser.supabaseUserId === authUserId) {
              console.log('User profile already linked to this auth user');
              return true;
            }
            
            // Update the user profile with the auth user ID
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                supabaseUserId: authUserId,
                updatedAt: new Date().toISOString()
              })
              .eq('id', existingUser.id);
            
            if (updateError) {
              console.error('Error updating user profile with auth ID:', updateError);
              console.error('Full error object:', JSON.stringify(updateError, null, 2));
              return false;
            }
            
            console.log('User profile successfully linked to auth user');
            return true;
          } else {
            // No user profile found with this email, check directory_profiles
            const { data: directoryProfile, error: directoryError } = await supabase
              .from('directory_profiles')
              .select('*')
              .eq('email', userEmail)
              .single();
            
            if (directoryError && directoryError.code !== 'PGRST116') { // Not found is ok
              console.error('Error finding directory profile:', directoryError);
              console.error('Full error object:', JSON.stringify(directoryError, null, 2));
            }
            
            if (directoryProfile) {
              // Directory profile exists, update it with the auth user ID
              const { error: updateDirError } = await supabase
                .from('directory_profiles')
                .update({ 
                  supabaseUserId: authUserId,
                  updatedAt: new Date().toISOString()
                })
                .eq('id', directoryProfile.id);
              
              if (updateDirError) {
                console.error('Error updating directory profile with auth ID:', updateDirError);
                console.error('Full error object:', JSON.stringify(updateDirError, null, 2));
                return false;
              }
              
              console.log('Directory profile successfully linked to auth user');
              return true;
            }
            
            // No profile found at all, create a new one in users table
            const now = new Date().toISOString();
            
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: authUserId, // Use the auth user ID as the profile ID
                email: userEmail,
                supabaseUserId: authUserId,
                role: 'user', // Default role for new users
                createdAt: now,
                updatedAt: now,
                isActive: true
              });
            
            if (createError) {
              console.error('Error creating new user profile:', createError);
              console.error('Full error object:', JSON.stringify(createError, null, 2));
              return false;
            }
            
            console.log('New user profile created and linked to auth user');
            return true;
          }
        } catch (error) {
          console.error('Error linking user profile with auth user:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return false;
        }
      },
      
      syncUserWithSupabase: async () => {
        console.log('Syncing user with Supabase...');
        
        try {
          const supabase = getSupabase();
          
          // Get current auth user
          const { data: authData, error: authError } = await supabase.auth.getUser();
          
          if (authError) {
            console.error('Error getting auth user:', authError);
            console.error('Full error object:', JSON.stringify(authError, null, 2));
            return false;
          }
          
          if (!authData.user) {
            console.log('No authenticated user found');
            set({ user: null, isAuthenticated: false });
            return false;
          }
          
          // Link the auth user with a user profile
          if (authData.user.email) {
            await get().linkUserProfileWithSupabaseAuth(authData.user.id, authData.user.email);
          }
          
          // Sync the auth user with the users table
          const syncResult = await syncUserWithSupabase(authData.user);
          
          if (!syncResult.success) {
            console.error('Error syncing user with Supabase:', syncResult.error);
            console.error('Error details:', syncResult.details);
            console.error('Error hint:', syncResult.hint);
            console.error('Full error:', syncResult.fullError);
            
            // Set the error message with more details
            set({ 
              error: `Error syncing user: ${syncResult.error}${syncResult.hint ? ` (Hint: ${syncResult.hint})` : ''}` 
            });
            return false;
          }
          
          // Get user profile from users table - ALWAYS fetch fresh data
          console.log('Fetching fresh user profile data from database...');
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('supabaseUserId', authData.user.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
            console.error('Error getting user profile by ID:', profileError);
            console.error('Full error object:', JSON.stringify(profileError, null, 2));
          }
          
          // If no profile found by ID, try to find by supabaseUserId
          let profile = profileData;
          
          if (!profile) {
            console.log('Profile not found by ID, trying supabaseUserId...');
            const { data: supabaseIdProfileData, error: supabaseIdProfileError } = await supabase
              .from('users')
              .select('*')
              .eq('supabaseUserId', authData.user.id)
              .single();
            
            if (supabaseIdProfileError && supabaseIdProfileError.code !== 'PGRST116') { // Not found is ok
              console.error('Error getting user profile by supabaseUserId:', supabaseIdProfileError);
              console.error('Full error object:', JSON.stringify(supabaseIdProfileError, null, 2));
            } else {
              profile = supabaseIdProfileData;
            }
          }
          
          // If still no profile found, try to find by email
          if (!profile && authData.user.email) {
            console.log('Profile not found by supabaseUserId, trying email...');
            const { data: emailProfileData, error: emailProfileError } = await supabase
              .from('users')
              .select('*')
              .eq('email', authData.user.email)
              .single();
            
            if (emailProfileError && emailProfileError.code !== 'PGRST116') { // Not found is ok
              console.error('Error getting user profile by email:', emailProfileError);
              console.error('Full error object:', JSON.stringify(emailProfileError, null, 2));
            } else {
              profile = emailProfileData;
              
              // If found by email but supabaseUserId is not set, update it
              if (profile && !profile.supabaseUserId) {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ 
                    supabaseUserId: authData.user.id,
                    updatedAt: new Date().toISOString()
                  })
                  .eq('id', profile.id);
                
                if (updateError) {
                  console.error('Error updating user profile with supabaseUserId:', updateError);
                  console.error('Full error object:', JSON.stringify(updateError, null, 2));
                } else {
                  console.log('Updated user profile with supabaseUserId');
                  profile.supabaseUserId = authData.user.id;
                }
              }
            }
          }
          
          // Add detailed logging of the fetched profile
          console.log('Fetched profile from Supabase:', JSON.stringify(profile, null, 2));
          
          // Log the role sources for debugging
          console.log('Role from database profile:', profile?.role);
          console.log('Role from auth user metadata:', authData.user.user_metadata?.role);
          
          // Create user object from auth data and profile
          // IMPORTANT: Always prioritize database values for role and other fields
          let userRole = profile?.role || authData.user.user_metadata?.role || 'user';
          
          console.log('User role is:', userRole);
          
          const user: User = {
            id: profile?.id || authData.user.id,
            username: authData.user.email?.split('@')[0] || '',
            email: authData.user.email || '',
            firstName: profile?.firstName || authData.user.user_metadata?.firstName || '',
            lastName: profile?.lastName || authData.user.user_metadata?.lastName || '',
            // CRITICAL: Always use the database role first
            role: userRole,
            permissions: profile?.permissions || [],
            profileImage: profile?.avatarUrl,
            phone: profile?.phone,
            bio: profile?.bio,
            createdAt: profile?.createdAt || authData.user.created_at || new Date().toISOString(),
            updatedAt: profile?.updatedAt || new Date().toISOString(),
            supabaseUserId: authData.user.id, // Always set this to the auth user ID
          };
          
          // Log the final role that will be used in the app
          console.log("Role used in app:", user.role);
          
          console.log('User synced with role:', user.role);
          
          // Update state
          set({ 
            user, 
            isAuthenticated: true,
            error: null
          });
          
          console.log('User synced with Supabase successfully');
          return true;
        } catch (error) {
          console.error('Error syncing user with Supabase:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          
          // Set a more detailed error message
          set({ 
            error: `Error syncing user: ${error.message || JSON.stringify(error)}` 
          });
          
          return false;
        }
      },
      
      initializeAuth: async () => {
        console.log('Initializing auth system...');
        
        // Set initialization status
        get().setInitializationStatus('initializing');
        
        try {
          // Check for existing session
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            get().setInitializationStatus('error');
            return false;
          }
          
          if (data.session) {
            // Get user data
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
              console.error('Error getting user:', userError);
              console.error('Full error object:', JSON.stringify(userError, null, 2));
              get().setInitializationStatus('error');
              return false;
            }
            
            if (userData.user) {
              // Link the auth user with a user profile
              if (userData.user.email) {
                await get().linkUserProfileWithSupabaseAuth(userData.user.id, userData.user.email);
              }
              
              // Sync the auth user with the users table
              const syncResult = await syncUserWithSupabase(userData.user);
              
              if (!syncResult.success) {
                console.error('Error syncing user with Supabase:', syncResult.error);
                console.error('Error details:', syncResult.details);
                console.error('Error hint:', syncResult.hint);
                console.error('Full error:', syncResult.fullError);
                
                // Set the error message with more details
                set({ 
                  error: `Error syncing user: ${syncResult.error}${syncResult.hint ? ` (Hint: ${syncResult.hint})` : ''}` 
                });
              }
              
              // Get additional user data from the users table - ALWAYS fetch fresh data
              console.log('Fetching fresh user profile data during initialization...');
              const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('supabaseUserId', userData.user.id)
                .single();
              
              if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
                console.error('Error getting user profile by supabaseUserId:', profileError);
                console.error('Full error object:', JSON.stringify(profileError, null, 2));
              }
              
              // If no profile found by supabaseUserId, try to find by email
              let profile = profileData;
              
              if (!profile && userData.user.email) {
                console.log('Profile not found by supabaseUserId, trying email...');
                const { data: emailProfileData, error: emailProfileError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('email', userData.user.email)
                  .single();
                
                if (emailProfileError && emailProfileError.code !== 'PGRST116') { // Not found is ok
                  console.error('Error getting user profile by email:', emailProfileError);
                  console.error('Full error object:', JSON.stringify(emailProfileError, null, 2));
                } else if (emailProfileData) {
                  profile = emailProfileData;
                  
                  // If found by email but supabaseUserId is not set, update it
                  if (!profile.supabaseUserId) {
                    const { error: updateError } = await supabase
                      .from('users')
                      .update({ 
                        supabaseUserId: userData.user.id,
                        updatedAt: new Date().toISOString()
                      })
                      .eq('id', profile.id);
                    
                    if (updateError) {
                      console.error('Error updating user profile with supabaseUserId:', updateError);
                      console.error('Full error object:', JSON.stringify(updateError, null, 2));
                    } else {
                      console.log('Updated user profile with supabaseUserId');
                      profile.supabaseUserId = userData.user.id;
                    }
                  }
                }
              }
              
              // Add detailed logging of the fetched profile
              console.log('Fetched profile from Supabase:', JSON.stringify(profile, null, 2));
              
              // Log the role sources for debugging
              console.log('Role from database profile:', profile?.role);
              console.log('Role from auth user metadata:', userData.user.user_metadata?.role);
              
              // Create user object - IMPORTANT: Always prioritize database values for role
              let userRole = profile?.role || userData.user.user_metadata?.role || 'user';
              
              console.log('User role is:', userRole);
              
              const user: User = {
                id: profile?.id || userData.user.id,
                username: userData.user.email?.split('@')[0] || '',
                email: userData.user.email || '',
                firstName: profile?.firstName || userData.user.user_metadata?.firstName || '',
                lastName: profile?.lastName || userData.user.user_metadata?.lastName || '',
                // CRITICAL: Always use the database role first
                role: userRole,
                permissions: profile?.permissions || [],
                profileImage: profile?.avatarUrl,
                phone: profile?.phone,
                bio: profile?.bio,
                createdAt: profile?.createdAt || userData.user.created_at || new Date().toISOString(),
                updatedAt: profile?.updatedAt || new Date().toISOString(),
                supabaseUserId: userData.user.id, // Always set this to the auth user ID
              };
              
              // Log the final role that will be used in the app
              console.log("Role used in app:", user.role);
              
              console.log('User initialized with role:', user.role);
              
              set({ 
                user, 
                isAuthenticated: true,
                error: null
              });
              
              // Reset the initialization attempts counter on success
              get().resetInitAttempts();
              
              // Set last initialization time
              get().setLastInitializationTime(Date.now());
              
              get().setInitializationStatus('success');
              return true;
            }
          }
          
          // No session found, enable preview mode instead of blocking the app
          get().setInitializationStatus('success');
          return enablePreviewMode(set, 'No active Supabase session found');
        } catch (error) {
          console.error('Error during auth initialization:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

          get().setInitializationStatus('error');
          return enablePreviewMode(set, `Auth initialization failed: ${errorMessage}`);
        }
      },
      
      ensureSupabaseReady: async () => {
        console.log('Ensuring Supabase is ready...');
        
        try {
          const supabase = getSupabase();
          
          // Simple test query to check if Supabase is working
          const { data, error } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true });
          
          if (error) {
            console.error('Supabase not ready:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return false;
          }
          
          console.log('Supabase is ready');
          return true;
        } catch (error) {
          console.error('Error checking Supabase readiness:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return false;
        }
      },
      
      checkSession: async () => {
        try {
          console.log('Checking for existing session...');
          
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session check error:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return false;
          }
          
          if (data.session) {
            console.log('Session found');
            return true;
          }
          
          console.log('No session found');
          return false;
        } catch (error) {
          console.error('Session check error:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return false;
        }
      },
      
      refreshSession: async () => {
        try {
          console.log('Refreshing session...');
          
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Session refresh error:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return false;
          }
          
          if (data?.session) {
            console.log('Session refreshed successfully');
            
            // Sync user data and refresh from database
            await get().syncUserWithSupabase();
            
            return true;
          }
          
          console.log('No session to refresh');
          return false;
        } catch (error) {
          console.error('Session refresh error:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return false;
        }
      },
      
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log(`Attempting to login user: ${username}`);
          
          // Check if username is an email
          const isEmail = username.includes('@');
          const email = isEmail ? username : `${username}@mysteriaevent.ch`;
          
          // Authenticate with Supabase
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) {
            console.error('Login error:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            set({ 
              isLoading: false, 
              error: `Identifiants invalides: ${error.message}` 
            });
            return;
          }
          
          if (data.session && data.user) {
            console.log('Login successful');
            
            // Store credentials for auto-login after refresh
            get().setStoredCredentials({ username, password });
            
            // Link the auth user with a user profile
            await get().linkUserProfileWithSupabaseAuth(data.user.id, data.user.email || email);
            
            // Sync the auth user with the users table
            const syncResult = await syncUserWithSupabase(data.user);
            
            if (!syncResult.success) {
              console.error('Error syncing user with Supabase:', syncResult.error);
              console.error('Error details:', syncResult.details);
              console.error('Error hint:', syncResult.hint);
              console.error('Full error:', syncResult.fullError);
              
              // Set the error message with more details but continue with login
              set({ 
                error: `Warning: Error syncing user profile: ${syncResult.error}${syncResult.hint ? ` (Hint: ${syncResult.hint})` : ''}` 
              });
            }
            
            // CRITICAL: Always fetch fresh user data from the database after login
            console.log('Fetching fresh user profile data after login...');
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('supabaseUserId', data.user.id)
              .single();
            
            if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
              console.error('Error getting user profile by supabaseUserId:', profileError);
              console.error('Full error object:', JSON.stringify(profileError, null, 2));
            }
            
            // If no profile found by supabaseUserId, try to find by email
            let profile = profileData;
            
            if (!profile) {
              console.log('Profile not found by supabaseUserId, trying email...');
              const { data: emailProfileData, error: emailProfileError } = await supabase
                .from('users')
                .select('*')
                .eq('email', data.user.email)
                .single();
              
              if (emailProfileError && emailProfileError.code !== 'PGRST116') { // Not found is ok
                console.error('Error getting user profile by email:', emailProfileError);
                console.error('Full error object:', JSON.stringify(emailProfileError, null, 2));
              } else {
                profile = emailProfileData;
                
                // If found by email but supabaseUserId is not set, update it
                if (profile && !profile.supabaseUserId) {
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                      supabaseUserId: data.user.id,
                      updatedAt: new Date().toISOString()
                    })
                    .eq('id', profile.id);
                  
                  if (updateError) {
                    console.error('Error updating user profile with supabaseUserId:', updateError);
                    console.error('Full error object:', JSON.stringify(updateError, null, 2));
                  } else {
                    console.log('Updated user profile with supabaseUserId');
                    profile.supabaseUserId = data.user.id;
                  }
                }
              }
            }
            
            // Add detailed logging of the fetched profile
            console.log('Fetched profile from Supabase:', JSON.stringify(profile, null, 2));
            
            // Log the role sources for debugging
            console.log('Role from database profile:', profile?.role);
            console.log('Role from auth user metadata:', data.user.user_metadata?.role);
            
            // Create user object - IMPORTANT: Always prioritize database values for role
            let userRole = profile?.role || data.user.user_metadata?.role || 'user';
            
            console.log('User role is:', userRole);
            
            const user: User = {
              id: profile?.id || data.user.id,
              username: data.user.email?.split('@')[0] || '',
              email: data.user.email || '',
              firstName: profile?.firstName || data.user.user_metadata?.firstName || '',
              lastName: profile?.lastName || data.user.user_metadata?.lastName || '',
              // CRITICAL: Always use the database role first
              role: userRole,
              permissions: profile?.permissions || [],
              profileImage: profile?.avatarUrl,
              phone: profile?.phone,
              bio: profile?.bio,
              createdAt: profile?.createdAt || data.user.created_at || new Date().toISOString(),
              updatedAt: profile?.updatedAt || new Date().toISOString(),
              supabaseUserId: data.user.id, // Always set this to the auth user ID
            };
            
            // Log the final role that will be used in the app
            console.log("Role used in app:", user.role);
            
            console.log('User logged in with role:', user.role);
            
            // If no profile exists, create one
            if (!profile) {
              try {
                const now = new Date().toISOString();
                
                const insertData = {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  role: user.role, // Use the role from metadata or default
                  supabaseUserId: data.user.id, // Set the Supabase auth user ID
                  createdAt: now,
                  updatedAt: now
                };
                
                console.log("Creating new user profile with data:", JSON.stringify(insertData, null, 2));
                
                const { data: newProfile, error: insertError } = await supabase
                  .from('users')
                  .insert(insertData)
                  .select()
                  .single();
                
                if (insertError) {
                  console.error('Error creating user profile:', insertError);
                  console.error('Full error object:', JSON.stringify(insertError, null, 2));
                  console.error('Error details:', insertError.details, "Error hint:", insertError.hint);
                } else {
                  console.log('Created new user profile');
                  // Update the user object with the new profile data
                  if (newProfile) {
                    user.id = newProfile.id;
                    user.profileImage = newProfile.avatarUrl;
                  }
                }
              } catch (createError) {
                console.error('Error creating user profile:', createError);
                console.error('Full error object:', JSON.stringify(createError, null, 2));
              }
            }
            
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              error: null
            });
          } else {
            console.log('Login failed: No session or user data');
            set({ 
              isLoading: false, 
              error: 'Erreur de connexion: Données utilisateur manquantes' 
            });
          }
        } catch (error) {
          console.error('Login error:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          set({ 
            isLoading: false, 
            error: 'Erreur de connexion: ' + (error.message || JSON.stringify(error))
          });
        }
      },
      
      logout: () => {
        try {
          console.log('Logging out');
          
          // Sign out from Supabase
          const supabase = getSupabase();
          supabase.auth.signOut();
          
          // Clear stored credentials
          get().setStoredCredentials(null);
        } catch (error) {
          console.error('Error signing out:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
        }
        
        console.log('User logged out, returning to preview mode');
        set({ 
          user: createPreviewUser(), 
          isAuthenticated: true,
          error: null
        });
      },
      
      updateUser: (user: User) => {
        set({ user });
      },
      
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log(`Sending password reset email to: ${email}`);
          
          const supabase = getSupabase();
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: Platform.OS === 'web' 
              ? `${window.location.origin}/reset-password` 
              : undefined
          });
          
          if (error) {
            console.error('Password reset error:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            throw error;
          }
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Password reset error:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la réinitialisation du mot de passe: ' + (error.message || JSON.stringify(error))
          });
        }
      },
      
      setFirstLoginComplete: () => {
        set({ isFirstLogin: false });
      }
    }),
    {
      name: 'mysteria-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields to avoid issues with circular references
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isFirstLogin: state.isFirstLogin,
        storedCredentials: state.storedCredentials,
      }),
    }
  )
);