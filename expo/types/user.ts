/**
 * Rôles applicatifs Mystéria.
 *
 * Source de vérité = check constraint sur `public.users.role` :
 *   `admin | responsable_pole | responsable_secteur | membre | user`
 *
 * Les valeurs `moderator | committee | actor | partner | other` sont des
 * legacy laissées pour rétrocompatibilité du code (settings.tsx, /profile,
 * admin/permissions, etc.) qui n'ont pas encore été migrées. Aucune row en
 * DB ne porte ces valeurs aujourd'hui — à nettoyer en session dédiée.
 */
export type UserRole =
  | 'admin'
  | 'responsable_pole'
  | 'responsable_secteur'
  | 'membre'
  | 'user'
  // Legacy — encore référencé dans des branches conditionnelles d'UI :
  | 'moderator'
  | 'committee'
  | 'actor'
  | 'partner'
  | 'other';

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
  // Rôle associatif optionnel (président, trésorier, secrétaire, comité…) —
  // distinct du `role` applicatif (admin/moderator/etc.). Affiché dans la
  // page user et la UserListItem si défini. Défini en DB côté admin/user-form.
  associationRole?: string;
}

// Added AuthState interface for auth-store.ts
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}