export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  memberIds: string[];
  /**
   * UUID du Responsable de Pôle (Vague B Phase 1, 2026-05-05).
   * Null si pas encore désigné. Pour les groupes "Comité" et autres non-pôles
   * applicatifs, peut rester null sans impact.
   */
  responsibleId?: string | null;
}
