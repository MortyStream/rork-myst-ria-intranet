export interface ResourceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  restrictedAccess?: boolean; // Si true, seuls les admins/modérateurs/responsables peuvent voir
  responsibleId?: string; // ID de l'utilisateur responsable de la catégorie
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  categoryId: string;
  requiredPermissions: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResourceItemType = 'folder' | 'file' | 'link' | 'text' | 'image';

export interface ResourceItem {
  id: string;
  title: string;
  type: ResourceItemType;
  description?: string;
  parentId: string | null;
  categoryId: string;
  content: string | null;
  url: string | null;
  fileUrl?: string | null; // URL du fichier uploadé
  hidden?: boolean; // Si true, l'élément est caché pour les utilisateurs normaux
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ExternalLinkType = 'website' | 'press' | 'video' | 'social' | 'other';

export interface ExternalLink {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: ExternalLinkType;
  createdAt: string;
  updatedAt: string;
}

export type CategoryMemberRole = 'responsable' | 'membre' | 'support';

export interface CategoryMember {
  id: string;
  userId: string;
  categoryId: string;
  role: CategoryMemberRole;
  createdAt: string;
  updatedAt?: string;
  // Champs additionnels pour l'affichage (joints depuis la table users)
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}