# Audit Salvatore (mai 2026) — État final V3b

> Source primaire : `.claude/archive/History 02.05.26 claude code.txt` (transcript complet de la session). Cette archive en est l'extraction structurée pour ne pas perdre les items individuels en cas de purge du transcript.

**Bilan final session V3b (2026-05-02/03)** : 29 / 50 items traités (62%), 2 skip volontaires (web-only), 19 restants pour sessions dédiées.

| Section | Total | ✅ Traités | ⏭️ Skip vol. | ❌ Restants |
|---|---|---|---|---|
| Bugs potentiels | 15 | 11 | 0 | 4 |
| UX/UI | 19 | 10 | 2 | 7 |
| Dette technique | 16 | 8 | 0 | 8 |
| **Total (hors features)** | **50** | **29** | **2** | **19** |

Les 13 features identifiées par l'audit ont été dépriorisées par l'user (focus app stable d'abord, features ensuite — voir `roadmap.md` § Idées features futures).

---

## Volet 1 — Audit initial Salvatore (15 items BUG/SEC)

Audit externe via Claude de Salvatore, fait depuis localStorage du Expo web preview. Plusieurs angles morts (pas d'accès au code source, hypothèses depuis l'extérieur).

| # | Item | État |
|---|---|---|
| 1 | BUG-002 Assignee picker vide (modal "Sélectionner des personnes") | ✅ Patché commit `9464e25` |
| 2 | BUG-005 Annuaire `/directory` vide | ✅ Patché (lié à #1) |
| 3 | BUG-003 `/profile` "non connecté" malgré login OK | ✅ Patché |
| 4 | BUG-006 `/admin` redirige `/login` pour Salvatore | ✅ Patché |
| 5 | SEC-001 RLS tasks "manquante" | ⏭️ Faux positif (admin = voit tout via `private.is_admin()`). À reconfirmer device user non-admin |
| 6 | SEC-004 URL Supabase fantôme `gwxyspmmczqqqrgmpmcf` | ✅ Patché |
| 7 | BUG-004 `/bible` → 404 | ✅ Patché (alias redirect /resources) |
| 8 | BUG-001 Bouton "Suivant" onboarding ne répond pas | ⏸️ Skip — web-only, app cible mobile |
| 9 | SEC-003 Credentials clear localStorage si "Mémoriser" ON | ✅ Fermé V2 (toggle "Mémoriser identifiants" supprimé, auto-login Supabase suffit) |
| 10 | SEC-002 Auth storage non-standard `sb-*` | ⏭️ Faux positif documenté (custom client intentionnel, Hard Lesson §5.2) |
| 11 | BUG-007 Counts UI vs DB incohérents | ⏭️ Effet mécanique de SEC-001 (admin voit tout) |
| 12 | BUG-008/SEC-005 `window.alert` natif sur erreurs form | ✅ Plusieurs forms migrés vers Toast/ConfirmModal (commits ultérieurs) |
| 13 | BUG-009 Header "Bonjour 👋" sans nom au retour `/home` | ✅ Patché (useFocusEffect re-fetch user) |
| 14 | BUG-010 Pas de bouton "+" sur Calendrier | ✅ Bouton header admin ajouté |
| 15 | SEC-006 XSS potentielle titres tâches | ⏭️ Pas de problème — RN ne fait pas de innerHTML, escape par défaut |

---

## Volet 2 — Audit étendu (agent Claude general-purpose, 50 items hors features)

### 2.1 Bugs potentiels (15)

| # | Item | Effort | État |
|---|---|---|---|
| 1 | `syncLocalReminders` cascade debounce — reminders jamais syncés en cas d'activité Realtime soutenue | S | ✅ V2 (signature stable deps) |
| 2 | Reactions jsonb full-replace → race condition 2 users simultanés | M | ✅ V2 (RPC Postgres `toggle_comment_reaction` atomique avec SELECT FOR UPDATE) |
| 3 | `auth-store.refreshUserData` lit `error.message` sur unknown → crash potentiel | S | ✅ V1 (helper `getErrorMessage`, 5 endroits patchés) |
| 4 | useEffect listeners expo-notifications jamais cleanup sur user.id change | S | ✅ V2 (flag `cancelled`) |
| 5 | useEffect `notifications.tsx` deps `[]` mais utilise fonctions Zustand → eslint-disable peut rater des resync | S | ❌ Restant — `eslint-disable` acceptable, pas de bug fonctionnel observé |
| 6 | Race condition `markAsRead` : tap-tap-tap rapide → multiples calls API redondants | S | ✅ V3a (idempotence — no-op si déjà lu) |
| 7 | `addComment` génère id côté client avec `Date.now()+Math.random()` → collision théorique | S | ✅ V3a (uuid v4) |
| 8 | `notifications-store.markAllAsRead` rollback efface markAsRead intermédiaires | S | ✅ V2 (rollback ciblé sur IDs réellement modifiés) |
| 9 | `fetchProfileWithRetry` ne distingue pas "JWT pas propagé" vs "vraiment introuvable" → 600ms+ pour rien | M | ❌ **Restant — vrai item à traiter** |
| 10 | `isObsolete` calculé sur store cold-start → faux négatifs (tasks `[]` → notif paraît active) | S | ❌ Restant — faux négatif transitoire, pas bloquant |
| 11 | `linkUserProfileWithSupabaseAuth` UPDATE sans filtre WHERE supabaseUserId IS NULL côté client | S | ✅ V3a (`.is('supabaseUserId', null)`) |
| 12 | `getEventsByDate` recalculé à chaque render sans `useMemo` | S | ✅ V3a (memoïsé sur date + storeEvents) |
| 13 | `TaskDetail.handleStartTask/CompleteTask/...` utilisent `Alert.alert` au lieu de ConfirmModal | S | ✅ V1 (4× Alert.alert → Toast non-bloquant) |
| 14 | `AppLayout` ferme sidebar sur changement pathname mais `toggleSidebar` change à chaque render → clignote | S | ✅ V3a (cascade re-fire fixée) |
| 15 | `OfflineBanner` set listeners global non cleanup | S | ❌ Restant — patron volontaire (single source of truth, Fast Refresh dev only) |

### 2.2 UX/UI (19)

| # | Item | Effort | État |
|---|---|---|---|
| 1 | Couleurs gradient hardcodées (6 quick access cards) | S | ⏭️ Skip volontaire — choix design (6 couleurs distinctes pour identifier visuellement les modules) |
| 2 | Status colors hardcodées home → `theme.warning/success/error` | S | ✅ V1 |
| 3 | Header chevron caret affiché systématiquement | S | ⏭️ Skip volontaire — choix design (CLAUDE.md "Chevron menu sidebar au lieu de burger moche") |
| 4 | Aucune animation sur changement filter/chips tâches | S | ❌ Restant — `LayoutAnimation` mérite test device Android |
| 5 | TaskDetail Modal sans gesture swipe-down (standard 2026 = bottom sheet draggable) | L | ❌ Restant — lié à `@gorhom/bottom-sheet` (Volet 2.3 #5) |
| 6 | Calendar cellules trop petites sur iPhone SE, pastilles débordent | S | ✅ V2 (`minHeight: 44`) |
| 7 | Button sans feedback haptic/scale press par défaut | S | ❌ Restant |
| 8 | Avatar dans assignees pas tappable → pas de navigation profil | S | ✅ V1 (TouchableOpacity + accessibility) |
| 9 | Touch targets sous 44pt (closeButton, markReadButton, chevron) | S | ✅ V1 (6 boutons patchés) |
| 10 | `accessibilityLabel` quasi-absent — App Store Review tape là-dessus | M | ❌ Restant — pass dédié 2-4h, prio App Store ready |
| 11 | Tap titre tâche dans Home → `/tasks` sans `highlightId` = pas de scroll | S | ✅ V1 |
| 12 | Reaction picker iOS centré au lieu d'apparaître au-dessus du commentaire (iMessage style) | M | ❌ Restant |
| 13 | Calendar : pas d'indicateur du nombre d'events quand >3 | S | ✅ V2 (`+N`) |
| 14 | Skeleton sans shimmer wave (juste opacity) — standard 2026 = gradient sweep | S | ✅ V2 (gradient sweep horizontal) |
| 15 | OfflineBanner jaune jure avec dark mode | S | ✅ V3a (dark mode adaptatif) |
| 16 | TaskItem border-left fixe 4px — Priority dot circulaire (Things 3) plus moderne | M | ❌ Restant |
| 17 | InAppNotificationToast pas de swipe latéral pour mark-as-read | S | ❌ Restant |
| 18 | EmptyText italique vs `<EmptyState>` riche — inconsistance | S | ✅ V3a (miniEmpty avec icône sur home) |
| 19 | Pas de "scroll to top" tap sur titre (iOS pattern) | M | ❌ Restant |

### 2.3 Dette technique (16)

| # | Item | Effort | État |
|---|---|---|---|
| 1 | 323 `console.log/error` dans bundle prod sans stripping | S | ✅ V1 (`babel-plugin-transform-remove-console`, préserve warn/error) |
| 2 | `auth-store.ts` : 1061 lignes, 3× lookup user dupliqué | M | ❌ Restant — code critique, mérite tests serrés device |
| 3 | Stores dupliqués `users-store` ET `supabase-users-store` | M | ❌ Restant — `admin/database.tsx` consomme le legacy |
| 4 | `types/task.ts` corrompu | M | ✅ V2 (reconstruit depuis schéma DB) |
| 5 | 0% test coverage — Jest baseline ciblé sur stores critiques | L | ❌ Restant — 4-6h juste pour setup |
| 6 | Pas de `React.memo` sur TaskItem/NotificationItem/UserListItem | M | ✅ V2 (3 components memoïsés) |
| 7 | AsyncStorage non encrypté pour tokens — migrer `mysteria-auth-state` vers `expo-secure-store` | M | ❌ Restant — limite iOS Keychain ~2KB/clé à valider |
| 8 | Pas d'intercepteur 401 → refresh → retry — JWT expiré → requêtes anon → données vides silencieuses | M | ✅ V3b (mutex partagé sur PostgrestClient) |
| 9 | `unregisterPushToken` non-await dans logout | S | ✅ V1 (await + try/catch) |
| 10 | Routes admin dupliquées `user-form` vs `supabase-user-form` | S | ✅ V3b (`supabase-user-form.tsx` supprimé, 404 lignes mort code) |
| 11 | `expo-haptics` import dynamique partout | S | ✅ V3a (17 imports → statiques sur 9 fichiers) |
| 12 | `linkUserProfileWithSupabaseAuth` exécuté 3× en cascade au login | M | ❌ Restant |
| 13 | `as any` casts disséminés (`_layout.tsx:138`, `Skeleton.tsx:48`...) | S | ❌ Restant — petite dette TS, mérite session typage dédiée |
| 14 | `@gorhom/bottom-sheet` pas utilisé alors qu'on simule via Modal | M | ❌ Restant — refactor UI sur 3 composants (TaskDetail + reaction picker + ParticipantsStack) |
| 15 | Aucun rate-limit client sur `addComment`/`addNotification` → spam-clic possible | S | ❌ Restant |
| 16 | `expo-image-picker.MediaTypeOptions` deprecated en SDK 54 | S | ✅ V1 (migré vers `mediaTypes: ['images']`) |

---

## ❌ Récap synthétique des 19 items restants

### Bugs (4)
- **Bug #5** useEffect notifications.tsx deps — eslint-disable acceptable, pas bloquant
- **Bug #9** fetchProfileWithRetry distinguer JWT vs profil — **vrai item M à traiter**
- **Bug #10** isObsolete cold-start faux négatifs — pas bloquant
- **Bug #15** OfflineBanner global listeners cleanup — patron volontaire

### UX (7)
- **UX #4** LayoutAnimation chips tâches (S, mais Android compat)
- **UX #7** Button feedback haptic/scale press par défaut (S)
- **UX #10** accessibilityLabel pass complet (M, prio App Store ready)
- **UX #12** Reaction picker iMessage anchored (M)
- **UX #16** TaskItem priority dot Things 3 style (M)
- **UX #17** InAppNotificationToast swipe latéral (S)
- **UX #19** Scroll-to-top tap titre (M)

### Dette tech (8) — surtout L effort
- **#2** Refactor `auth-store.ts` 1061→~600 lignes (M-L) — code critique
- **#3** Dédoublonner `users-store` vs `supabase-users-store` (M)
- **#5** Tests Jest baseline (L) — 4-6h setup
- **#7** AsyncStorage → `expo-secure-store` (M) — limite Keychain à valider
- **#12** `linkUserProfileWithSupabaseAuth` 3× cascade login (M)
- **#13** `as any` casts disséminés (S)
- **#14** `@gorhom/bottom-sheet` (M)
- **#15** Rate-limit client `addComment`/`addNotification` (S)

---

## Commits qui ont fermé l'audit

| Commit | Vague | Items |
|---|---|---|
| `9464e25` | V0 (audit Salvatore brut) | BUG-002/003/005/006 + SEC-004 + BUG-004 |
| `56472d9` | V1 + refonte notifs | Audit étendu V1 (9 items) — console.log strip, MediaTypeOptions, status colors, highlightId, unregisterPushToken await, getErrorMessage helper, Alert→Toast TaskDetail, touch targets, avatar tap |
| `2ae4434` | V2 — bugs réels + perf | 7 items — syncLocalReminders, reactions RPC, markAllAsRead, listeners cleanup, types/task, React.memo, Calendar cellules + +N, Skeleton shimmer |
| `f091bef` | V3a — items S | 8 items — AppLayout cascade, linkUserProfile filter, markAsRead idempotent, addComment uuid, getEventsByDate memo, expo-haptics static, OfflineBanner dark, EmptyText→miniEmpty |
| `89e4a7f` | V3b — items L ciblés | 2 items — intercepteur 401 + suppression supabase-user-form (404 lignes mort code) |

---

## Pourquoi les 19 items restants n'ont PAS été traités

**Les 8 items L effort** (auth-store refactor, Jest, expo-secure-store, bottom-sheet, etc.) méritent leur propre session dédiée avec testing rigoureux — bâcler le refactor de 1061 lignes d'`auth-store.ts` = login cassé pour tous les users.

**Les 4 bugs restants** sont en fait 3 faux positifs / patrons volontaires + 1 seul vrai item (Bug #9 fetchProfileWithRetry M effort).

**Les 7 UX restants** sont du polish moderne — non-bloquants pour la soumission App Store sauf #10 (accessibilityLabel) qui est important pour le review process Apple.
