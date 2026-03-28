export type UserRole = 'admin' | 'moderator' | 'committee' | 'actor' | 'partner' | 'other' | 'user';

export interface UserSector {
  name: string;
  isResponsible: boolean;
  roleId?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  profileImage?: string; // Added profileImage property
  bio?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  editable: boolean; // Whether the profile can be edited by others
  sectors?: UserSector[];
  userGroups?: Array<{ groupId: string; roleId: string }>;
  permissions?: string[];
  username?: string;
  supabaseUserId?: string;
  editable_by?: string; // UUID of the Supabase user who can edit this profile
}

// Added AuthState interface for auth-store.ts
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}