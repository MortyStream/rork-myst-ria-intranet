import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User, AuthState } from '@/types/user';
import { getSupabase, syncUserWithSupabase, cacheAccessToken } from '@/utils/supabase';
import { unregisterPushToken } from '@/utils/push-notifications';
import { clearAllLocalReminders, clearAppBadge } from '@/utils/local-notifications';

// SÉCURITÉ : aucun "PREVIEW_USER" admin auto-loggué.
// Les anciens DEFAULT_ADMIN / DEFAULT_MODERATOR / PREVIEW_USER ouvraient une porte dérobée
// (n'importe quelles creds → accès admin via état initial). Tout est désormais à null
// par défaut, et l'app oblige à passer par une vraie authentification Supabase.

// Helper sûr pour extraire un message lisible depuis une valeur de catch typée unknown.
// Avant ce helper, le code lisait `error.message` sans guard, ce qui crash si error
// n'est pas un objet Error (string, undefined, objet API). Ne jamais re-jeter ici.
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code].filter((v): v is string => Boolean(v));
    if (parts.length > 0) return parts.join(' · ');
  }
  try { return JSON.stringify(error); } catch { return 'Erreur inconnue'; }
};

const clearAuthState = (
  set: (partial: Partial<AuthStore>) => void,
  reason: string,
  errorMessage?: string,
): boolean => {
  console.log(`Auth state cleared: ${reason}`);
  set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: errorMessage ?? null,
  });
  return false;
};

interface AuthStore extends AuthState {
  user: User | null; // Explicitly adding user property to fix TypeScript error
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
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
      user: null,
      isAuthenticated: false,
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

        // Reset à l'état déconnecté — l'utilisateur devra se reconnecter
        set({
          user: null,
          isAuthenticated: false,
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
            console.log('No current user or supabaseUserId to refresh');
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
        // Best-effort : tente de lier la row `users` existante (créée par un admin)
        // au nouveau auth.uid() Supabase. Si on ne trouve rien, on n'INSERT PAS
        // de nouveau profil (les profils sont créés exclusivement par les admins).
        // Le fallback dans login() gère le cas "trouvé par email mais pas lié".
        console.log(`Linking user profile with Supabase auth: ${authUserId}, email: ${userEmail}`);

        try {
          const supabase = getSupabase();

          // 1. Cherche par supabaseUserId — si déjà lié, on est bon
          const { data: byAuthId } = await supabase
            .from('users')
            .select('id, supabaseUserId')
            .eq('supabaseUserId', authUserId)
            .maybeSingle();

          if (byAuthId) {
            console.log('User profile already linked');
            return true;
          }

          // 2. Sinon, cherche par email (case-insensitive)
          const { data: byEmail, error: emailErr } = await supabase
            .from('users')
            .select('id, supabaseUserId')
            .ilike('email', userEmail)
            .maybeSingle();

          if (emailErr) {
            // Probablement un échec RLS (JWT pas encore propagé). Pas grave,
            // le fallback dans login() retentera après que la session soit settled.
            console.log('linkUserProfile: lookup par email a échoué (non-bloquant):', emailErr.message);
            return false;
          }

          if (!byEmail) {
            console.log('linkUserProfile: aucun profil trouvé pour cet email — un admin doit créer le compte.');
            return false;
          }

          if (byEmail.supabaseUserId === authUserId) {
            return true; // Déjà lié, ne rien faire
          }

          // 3. Lie la row à l'auth user. On filtre EXPLICITEMENT
          // sur supabaseUserId IS NULL côté client : si la row est déjà liée
          // à un autre auth user (cas edge : ré-utilisation d'email), l'UPDATE
          // affecte 0 rows et le caller log proprement au lieu de tomber sur
          // une erreur RLS confuse côté server.
          const { error: updateErr } = await supabase
            .from('users')
            .update({
              supabaseUserId: authUserId,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', byEmail.id)
            .is('supabaseUserId', null);

          if (updateErr) {
            console.log('linkUserProfile: update échoué (non-bloquant):', updateErr.message);
            return false;
          }

          console.log('User profile linked successfully');
          return true;
        } catch (error: any) {
          console.log('linkUserProfile: exception (non-bloquant):', error?.message ?? error);
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
            error: `Error syncing user: ${getErrorMessage(error)}`
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
            // Si on a une erreur réseau / transitoire MAIS qu'un user est
            // déjà persisté dans Zustand (state local), on garde l'auth state
            // pour ne pas éjecter l'user vers /login. Le retry naturel
            // (auto-refresh, prochain reload) résoudra. C'est ce que font
            // Facebook/Instagram/etc : pas de logout sur une erreur transitoire.
            const persistedUser = get().user;
            if (persistedUser?.supabaseUserId) {
              console.log('Session error but persisted user exists — keeping logged in (graceful degradation)');
              return true;
            }
            return false;
          }

          if (data.session) {
            // CRITICAL : cacher le JWT TOUT DE SUITE pour que les requêtes
            // Postgres qui suivent (linkUser, syncUser, fetch profile) partent
            // avec le bon Authorization header. Sans ça, fenêtre de race où
            // le fetch wrapper fallback en anon → RLS bloque → erreurs en
            // cascade → clearAuthState → user éjecté à tort (cf. Hard Lesson 5.2).
            cacheAccessToken(data.session.access_token);

            // Get user data
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userError) {
              console.error('Error getting user:', userError);
              console.error('Full error object:', JSON.stringify(userError, null, 2));
              get().setInitializationStatus('error');
              // Idem : si user persisté dispo, on garde — la session JWT
              // est valide (data.session existe), seul getUser a pété.
              const persistedUser = get().user;
              if (persistedUser?.supabaseUserId) {
                console.log('getUser error but session + persisted user OK — keeping logged in');
                return true;
              }
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
          
          // Pas de session valide → l'utilisateur DOIT passer par /login.
          // Plus de fallback "preview admin" qui ouvrait une porte dérobée.
          get().setInitializationStatus('success');
          return clearAuthState(set, 'No active Supabase session found');
        } catch (error) {
          console.error('Error during auth initialization:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));

          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

          get().setInitializationStatus('error');
          // Erreur potentiellement transitoire (réseau, timeout). Si on a
          // déjà un user persisté en local, on le garde plutôt que d'éjecter
          // — comportement standard des apps modernes (FB/Insta) qui
          // tolèrent un offline temporaire en gardant la session locale.
          const persistedUser = get().user;
          if (persistedUser?.supabaseUserId) {
            console.log('Init exception but persisted user exists — keeping logged in');
            return true;
          }
          return clearAuthState(set, `Auth initialization failed`, errorMessage);
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
            // SÉCURITÉ : forcer user/isAuthenticated à null sur erreur pour qu'aucun
            // état résiduel (ancien preview, session expirée) ne laisse passer.
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: `Identifiants invalides: ${getErrorMessage(error)}`,
            });
            return;
          }
          
          if (data.session && data.user) {
            console.log('Login successful');

            // Store credentials for auto-login after refresh
            get().setStoredCredentials({ username, password });

            // CRITIQUE : 1) cacher le token en mémoire DANS le client Supabase
            // (synchrone, garanti) 2) appeler setSession() pour update GoTrueClient.
            // Le cache mémoire est lu en priorité par le fetch wrapper, donc même
            // si getSession() est en retard, les requêtes partent avec le bon JWT.
            if (data.session?.access_token) {
              cacheAccessToken(data.session.access_token);
            }
            try {
              if (data.session?.access_token && data.session?.refresh_token) {
                await supabase.auth.setSession({
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                });
              }
            } catch (e) {
              console.log('setSession warmup error (ignored):', e);
            }

            // Helper : retry un fetch jusqu'à 3x avec backoff. Distinction
            // critique entre deux cas qui ressemblent tous les deux à "row null" :
            // - error null + row null = la query A RÉUSSI mais le profil n'existe
            //   pas → fail fast, retry serait du gaspillage (600ms perdus).
            // - error non-null = vraie erreur (JWT pas propagé / RLS / réseau)
            //   → retry avec backoff a du sens, ça peut se résoudre au prochain
            //   attempt (ex : JWT mémoire-cache pas encore lu par le wrapper fetch).
            const fetchProfileWithRetry = async (
              field: 'supabaseUserId' | 'email',
              value: string,
              attempts = 3
            ): Promise<any> => {
              for (let i = 0; i < attempts; i++) {
                const { data: row, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq(field, value)
                  .maybeSingle();
                if (row) return row;
                if (!error) return null;
                console.log(`fetchProfile by ${field} attempt ${i + 1} failed:`, getErrorMessage(error));
                if (i < attempts - 1) {
                  await new Promise<void>((r) => setTimeout(r, 200 * (i + 1)));
                }
              }
              return null;
            };

            // Link the auth user with a user profile (best-effort, non-bloquant)
            await get().linkUserProfileWithSupabaseAuth(data.user.id, data.user.email || email);

            // Sync the auth user with the users table (best-effort, non-bloquant)
            const syncResult = await syncUserWithSupabase(data.user);
            if (!syncResult.success) {
              console.log('syncUserWithSupabase non-bloquant:', syncResult.error);
            }

            // Fetch profile : par supabaseUserId d'abord, fallback email
            console.log('Fetching fresh user profile data after login...');
            let profile = await fetchProfileWithRetry('supabaseUserId', data.user.id);

            if (!profile) {
              console.log('Profile not found by supabaseUserId, trying email...');
              profile = await fetchProfileWithRetry('email', data.user.email || '');

              // Si trouvé par email mais pas encore lié, on lie maintenant
              if (profile && !profile.supabaseUserId) {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({
                    supabaseUserId: data.user.id,
                    updatedAt: new Date().toISOString(),
                  })
                  .eq('id', profile.id);
                if (updateError) {
                  console.log('Update supabaseUserId échoué (non-bloquant):', updateError.message);
                } else {
                  profile.supabaseUserId = data.user.id;
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
            
            // Note : si aucun profil n'a été trouvé (ni par supabaseUserId, ni par email),
            // on NE crée PAS de profil ici. Les profils utilisateurs sont gérés par les
            // admins via le panneau d'administration — l'auto-création au login ouvrirait
            // une faille (n'importe qui pourrait s'inscrire). Si profile est null, l'app
            // utilisera les données auth user_metadata en fallback (déjà géré ci-dessus).
            if (!profile) {
              console.log('Aucun profil DB trouvé — utilisation des données auth_metadata. Un admin doit créer le profil.');
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
            error: 'Erreur de connexion: ' + getErrorMessage(error),
          });
        }
      },

      logout: async () => {
        try {
          console.log('Logging out');

          const currentUser = get().user;

          // Remove push token from Supabase AVANT le signOut. On await pour
          // garantir que la requête DELETE part avec le JWT valide — sinon
          // signOut clear le token et la requête peut partir en anon → token
          // reste en DB et l'user continuerait à recevoir des push fantômes.
          if (currentUser && currentUser.id !== 'preview-user') {
            try {
              await unregisterPushToken(currentUser.id);
            } catch (err) {
              console.log('unregisterPushToken error (non-blocking):', getErrorMessage(err));
            }
          }

          // Clear le cache du JWT — sinon le fetch wrapper continuerait
          // d'utiliser l'ancien token jusqu'à expiration
          cacheAccessToken(null);

          // Clear toutes les notifs locales programmées (sinon un autre user
          // qui se connecterait sur le même device recevrait les rappels)
          clearAllLocalReminders().catch(() => {});

          // Reset le badge sur l'icône (sinon le chiffre persiste à l'écran
          // d'accueil même quand l'app est déconnectée)
          clearAppBadge().catch(() => {});

          // Sign out from Supabase
          const supabase = getSupabase();
          supabase.auth.signOut();

          // Clear stored credentials
          get().setStoredCredentials(null);
        } catch (error) {
          console.error('Error signing out:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
        }

        console.log('User logged out');
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      updateUser: async (user: User) => {
        try {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('users')
            .update({
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              bio: user.bio,
              // La colonne Supabase s'appelle avatarUrl, pas profileImage
              avatarUrl: user.profileImage ?? user.avatarUrl,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', user.id);
          if (error) {
            console.error('updateUser Supabase error:', error);
          }
        } catch (e) {
          console.error('updateUser error:', e);
        }
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
            error: 'Erreur lors de la réinitialisation du mot de passe: ' + getErrorMessage(error),
          });
        }
      },
      
      setFirstLoginComplete: () => {
        set({ isFirstLogin: false });
      }
    }),
    {
      // 🚨 IMPORTANT : cette clé NE DOIT PAS coïncider avec AUTH_STORAGE_KEY
      // de utils/supabase.js (qui vaut 'mysteria-auth-storage' et stocke la
      // session GoTrueClient). Avant v3, les deux utilisaient le même nom →
      // Zustand persist écrasait la session JWT à chaque update du store →
      // au cold start, getSession() lisait du JSON Zustand au lieu d'une
      // session valide → parse fail → null → l'user était redirigé vers
      // /login alors qu'il devrait être auto-loggué.
      name: 'mysteria-auth-state',
      storage: createJSONStorage(() => AsyncStorage),
      // version 2 → preview-user invalidation (cf. CLAUDE.md Hard Lesson 5.1)
      // version 3 → migration vers la nouvelle clé pour résoudre la collision avec GoTrueClient
      version: 3,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = (persistedState ?? {}) as { user?: { id?: string } | null; isAuthenticated?: boolean };
        if (fromVersion < 2 && state.user?.id === 'preview-user') {
          return {
            ...state,
            user: null,
            isAuthenticated: false,
            storedCredentials: null,
          };
        }
        // Pour la migration v2 → v3 : pas de transformation nécessaire,
        // le simple changement de clé suffit. L'ancienne clé sera lue par
        // GoTrueClient dorénavant (et son contenu sera corrigé au prochain
        // login). Le state local repart de l'état persisté actuel.
        return state;
      },
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