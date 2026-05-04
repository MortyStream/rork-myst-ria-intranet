/**
 * Modèle Pôle → Secteur → Membre (Vague B Phase 1, 2026-05-05).
 *
 * - Pôle = `user_groups` (5 fixes : Comité + 4 pôles), avec un champ
 *   `responsibleId` pointant sur le Responsable de Pôle (RP).
 * - Secteur = `sectors`, créé à la demande sous un pôle, avec un RS optionnel.
 * - Membre dans secteur = `sector_members` (M2M).
 *
 * Helper RLS côté DB : `private.user_team_user_ids(user_id)` retourne le scope
 * de visibilité pour la "Vue d'équipe" de l'onglet tâches (Vague B Phase 3).
 */

export interface Sector {
  id: string;
  name: string;
  /** UUID du `user_groups` (= pôle parent). */
  poleId: string;
  /** UUID du Responsable de Secteur (RS), null si non désigné. */
  responsibleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectorMember {
  sectorId: string;
  userId: string;
  addedAt: string;
}

/**
 * Pôle = user_group avec un RP désigné (responsibleId).
 * Cf. types/user-group.ts pour le type complet de user_groups.
 */
