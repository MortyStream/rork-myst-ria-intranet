# Roadmap, état courant & contacts

> État du projet, prochaines étapes, ressources externes. À lire pour planifier une nouvelle feature, comprendre où on en est, ou trouver un contact.

**Dernière update** : 2026-05-06 (chantiers 2/3/4 traités — RLS strict pending_approval, Edge function quiet hours, App Review prêt)

---

## 🎯 Prochains chantiers prioritaires

Liste des vraies choses à faire, dans un ordre raisonné. À attaquer tête reposée, en sessions ciblées.

### 1. Tests testeurs WhatsApp + feedback (avant tout)

Une dizaine de features et refactors UI/UX ont été livrés sans test device complet — Kévin a juste testé les flows critiques. Avant d'enchaîner sur du nouveau, il faut :

- Distribuer un message d'update aux testeurs (ping admins/RS/RP/membres pour couvrir les rôles)
- Récupérer leurs retours
- Fixer les régressions éventuelles

**Tests prioritaires à faire couvrir** (à dispatcher dans le groupe WhatsApp) :
- **Pôles & Secteurs** : login admin → /admin/sectors → créer secteurs, affecter membres, désigner RS/RP. Côté membre : vérifier que pas d'accès à /admin/sectors.
- **Vue d'équipe (👥)** : login RP/RS → bouton 👥 dans onglet tâches → /team-tasks groupé par membre.
- **Workflow validation cross-secteur** : membre A (secteur X) crée tâche pour membre B (secteur Y) → tâche devient `pending_approval`, RS du secteur Y voit "À valider", peut Approuver/Rejeter avec raison.
- **Pièces jointes tâches** : photo/fichier/lien sur une tâche, ouverture, suppression.
- **Mentions @user** : autocomplete inline dans commentaires, notif aux mentionnés.
- **Drafts forms** : commencer une tâche/event, fermer l'app, rouvrir → toast "Brouillon restauré".
- **Récurrence events** : créer event "Hebdomadaire" → 12 occurrences générées automatiquement.
- **Mode ne pas déranger** : Settings → toggle + plage horaire. Vérifier en device qu'un user en quiet hours reçoit la notif in-app (history) mais PAS le push Expo (sonnerie/banner).

### 2. Compte démo — étape finale avant submit App Store

Les artefacts d'App Review sont prêts (cf. §État livré 2026-05-06 ci-dessous). Restera à :
- **Provisionner le compte démo** : créer `demo@mysteriaevent.ch` rôle `membre` via `/admin/user-form` (Hard Lesson §5.4 — JAMAIS d'INSERT direct sur `auth.users`)
- **Lancer le seed** : récupérer le UUID du user créé, le coller dans `supabase/seed_demo_data.sql`, exécuter dans le SQL Editor
- **Renseigner le mdp démo** dans `.claude/app-review-notes.md` §3 (App Review Notes texte type)
- **Capturer les screenshots** sur device réel selon la liste `.claude/app-review-notes.md` §6
- **EAS Build production** : `eas build --profile production --platform all` puis submit. Activera aussi push remote vraies (Expo Go ne supporte pas), Quick Actions long-press icône, Widgets iOS/Android.

### 3. Refactors L effort (sessions dédiées tests device)

Reportés depuis l'audit Salvatore. Tous demandent un cycle de tests complet device parce qu'ils touchent zones critiques.

| Item | Pourquoi attendre une session dédiée |
|---|---|
| **Refactor `auth-store.ts`** (1061 → ~600 lignes) | Hard Lessons §5.1 / §5.2 / §5.3 / §5.4 — toucher à l'auth a déjà cassé la prod 4×. Lookup user dupliqué 3× à factoriser. |
| **`expo-secure-store`** pour auth-state + tokens | Sécurité tangible (tokens chiffrés Keychain iOS / Keystore Android). Mais limite Keychain ~2KB/clé à valider sur la taille réelle de la session Supabase avant migration. |
| **Dédoublonner `users-store` vs `supabase-users-store`** | `admin/database.tsx` consomme `supabase-users-store` (legacy) avec mock data flag + 5 méthodes (`createUser`, `updateUser`, `deleteUser`, `fetchUsers`, `getUserById`) absentes de `users-store`. Migration demande soit d'enrichir users-store, soit de refactor admin/database.tsx. |
| **`@gorhom/bottom-sheet`** | Refactor UI sur 3 composants (TaskDetail Modal, reaction picker emoji, ParticipantsStack). TaskDetail est central, tests visuels iOS+Android requis. |
| **Tests Jest baseline** | Setup environment Jest + mocks Zustand/Supabase/AsyncStorage + écriture tests sur stores critiques (auth, tasks). |

### 4. Idées features futures (à valider avec l'asso)

- **Catégorie privée pour events** (visible seulement par membres listés) — partiellement implémentable via `restrictedAccess` mais pas exposé pour events.
- **Calendar export .ics** (importer events Mystéria dans Apple Calendar / Google Calendar natifs).
- **Recherche globale cross-modules** (tâches + events + Bible + users dans une seule barre style Slack `Cmd+K`).
- **Indicateur "vu"/"reçu"** sur les notifs (style WhatsApp).
- **Onboarding contextuel** (tooltips premier usage — long-press = supprimer est caché actuellement).
- **Quick filters sauvegardés** sur Tâches (les chips combinables doivent être ré-appliqués à chaque session).
- **Pull-to-refresh** sur Bible et Notifications mode catégories (manque).
- **Dashboard stats admin** plus poussé.

---

## ✅ État livré au 2026-05-06

### Session du 2026-05-06 — chantiers 2 / 3 / 4 roadmap

**Chantier 4 — RLS strict pending_approval**
Policy `tasks_read_authenticated` réécrite : exclut `approvalStatus = 'pending_approval'` SAUF si caller = créateur OU admin/modo OU validateur potentiel (RS du secteur d'un assignee, RP du pôle d'un assignee). Helper SQL `private.can_validate_task(jsonb)` factorise la logique. Filtre client gardé en défense en profondeur. Migration `tasks_rls_strict_pending_approval`.

**Chantier 2 — Edge function quiet hours (F5 complète)**
Helper batch `public.users_not_in_quiet_hours(uuid[])` (RPC `authenticated`). Branché côté Edge `scheduled-reminders/index.ts` (v4 déployée) + côté client `expo/utils/push-notifications.ts`. Notifs in-app DB conservées (history), seul le push Expo skippe les users en quiet hours. Fail-open si la RPC échoue. Migration `users_not_in_quiet_hours_batch`.

**Chantier 3 — Compte démo + App Review (artefacts prêts)**
- `.claude/app-review-notes.md` : descriptions FR/EN, App Review note pour reviewers Apple, privacy questionnaire, Info.plist usage descriptions, checklist screenshots, instructions provisioning.
- `supabase/seed_demo_data.sql` : peuplement idempotent paramétré par UUID demo (3 tâches statuts variés, 2 events upcoming, 1 catégorie Bible + 2 items). Tous préfixés `[Demo]` pour purge facile.
- Création du compte demo elle-même reste à faire en device (cf. chantier 2 prochains).

### Sessions du 2026-05-04 / 05 (intensives)

**Vague A — Refonte UI filtres tâches** (commit `dd75232`)
2 chips simples en tête (À faire / Tâches données) + bouton funnel ⚙ vers bottom-sheet "Filtres avancés" (catégorie, priorité, retard). Plus de scroll horizontal de 7 chips. Titre dynamique entre les chips et la liste. Wrap label "Se déconnecter" fixé dans ConfirmModal.

**Vague B — Pôles → Secteurs → Membres + Vue d'équipe** (commits `69ba614` / `4ed8f75` / `6f6bdd8`)
Modélisation hiérarchique de l'asso. Tables `sectors` + `sector_members`, colonne `user_groups.responsibleId`. Helpers SQL `private.is_pole_responsible`, `is_sector_responsible`, `user_team_user_ids`, RPC `get_my_team_user_ids`. Panel admin `/admin/sectors` pour CRUD secteurs + affectation membres + désignation RS/RP. Bouton 👥 dans Header onglet tâches (admin/RP/RS) → écran `/team-tasks` groupé par membre, tri par "tâches en retard" décroissant.

**Vague C — Workflow validation cross-secteur** (commit `4c014dc`)
Quand un membre A donne une tâche à un membre B d'un autre secteur, validation requise par le RS du secteur de B. Skip si admin / RP du pôle / partage de secteur. ALTER `tasks` (approvalStatus + 5 colonnes), trigger BEFORE INSERT auto-set, RPC `tasks_pending_my_approval` / `approve_task` / `reject_task`. Côté front : badge "En attente d'approbation", boutons Approuver/Rejeter, modal raison de rejet, section "À valider (N)" en tête de l'onglet tâches.

**5 features court terme S/M** (commits `3560347` / `7873d97` / `7f39c71`)
- F1 : Pièces jointes (image / fichier / lien) — table `task_attachments` + bucket storage privé + composant `TaskAttachments` dans TaskDetail.
- F2 : Mentions @user — autocomplete inline dans TaskDetail, parsing au submit, notif aux mentionnés.
- F3 : Drafts autosave — hook `useFormDraft` AsyncStorage, intégré TaskForm + EventForm.
- F4 : Récurrence events — `recurrence` enum + génération auto 5-12 instances.
- F5 : Mode Ne pas déranger — colonnes `quietHours*` + helper `user_in_quiet_hours()` + UI Settings (⚠️ pas encore consommé côté Edge).

**UX audit** (commit `1f3760e`)
Reaction picker iMessage anchored (measureInWindow), TaskItem priority dot Things 3, LayoutAnimation chips tâches, prop `accessibilityLabel` sur Button.

**Hotfixes test user** (commits `4341c0c` → `bb7fe42`)
RLS storage avatars, double-tap nav protection, race Realtime tasks doublon, B1 ConfirmModal event-detail, B2 régression Button, I2-sync fallback fetch event, I3 cascade DELETE notifs, I1/I2 notifs RSVP/start/complete tâche, I4/I4-fix RSVP buttons, I5 delete commentaire, B3 détection event supprimé, U1-U5 (filtres simplifiés Vague A précurseur, pop-up déconnexion, lien externe, bio profile, clavier Android), U1bis-U4bis (refactor filtres, sidebar logout, lien court, role centré). Trigger DB rate-limit notifications côté serveur.

### Sessions antérieures (2026-04-22 → 05-03) — résumé

- **Sécurité** : Mode Preview supprimé, RLS Phase 1+2 strict, JWT propagation fix, collision storageKey fix, credentials clear AsyncStorage retirés, leaked password protection activée.
- **Notifications v1.4** : refonte complète — deep-link tap, long-press menu pour tous, ConfirmModal, SectionList groupé par jour, distinction lue/non-lue, Toast in-app slide-down style WhatsApp. **Bug critique notifs UUID résolu** : avant les `addNotification` côté front généraient des id non-UUID → INSERT échouait silencieusement, 0 notif en DB depuis toujours.
- **Auto-login** : plus besoin de se reco à chaque ouverture, tolérance erreurs transitoires.
- **Realtime v1.3** : sync globale tasks INSERT/UPDATE/DELETE, commentaires temps réel, indicateur "X est en train d'écrire", réactions emoji 👍❤️🙏😂 atomiques (RPC `toggle_comment_reaction`).
- **Sync différée offline v1.3** : pending-queue-store + queue-worker, drain au retour online.
- **Search + filtres tâches v1.3** : search bar + chips Mes/Données/Catégorie/Priorité/Retard.
- **Performance** : React.memo TaskItem/NotificationItem/UserListItem, getEventsByDate memoïsé, intercepteur 401 → refresh → retry sur custom Postgrest client.
- **Audit Salvatore mai 2026** : 47/50 items traités après cette session du 2026-05-05 (~94%). Détail avec ✅/⏭/❌ : `.claude/archive/audit-salvatore-mai-2026.md`. 3 restants = les refactors L listés ci-dessus.

### 🟡 Limites connues

1. **Pas de tests automatisés** : Jest baseline reste à faire (cf. chantier 3).
2. **`supabase-users-store.ts` doublon** : encore consommé par `admin/database.tsx` (panel legacy). Migration prévue (cf. chantier 3).

### ⏸️ En attente externe

- **DNS Resend** : `mysteriaevent.ch` chez Webland.ch — à check régulièrement, quand vert → rebrancher Edge Function `send-bug-email` côté `settings.tsx`.
- **EAS Build** : sortie d'Expo Go nécessaire pour activer push remote vraies + Quick Actions + Widgets.

---

## ⚠️ NE PAS FAIRE (rappel critique)

Liste exhaustive dans `hard-lessons.md`. Top critiques :

- Réintroduire un Mode Preview / fallback auto-loggué (§5.1)
- Faire un INSERT auto-create dans le flow login (§5.4)
- Appeler `reinitializeSupabase()` dans un retry path (§5.3)
- Mettre des policies RLS avec rôle `anon`
- Storage RLS `TO PUBLIC` — ne s'applique pas à `authenticated` sur storage.objects (§5.23). TOUJOURS `TO authenticated` explicite.
- Race Realtime onInsert ↔ set local : dédup obligatoire des deux côtés (§5.24)
- Chaîner deux `ConfirmModal` dont le 2ème dépend du state du 1er (§5.18)
- IDs côté client pour colonnes `uuid` Postgres : TOUJOURS `uuid v4`, jamais `Date.now()+Math.random()` (§5.22)

---

## 📞 Contacts & Ressources

- **GitHub** : [github.com/MortyStream/mysteria-app](https://github.com/MortyStream/mysteria-app)
- **Supabase Dashboard** : project `toefttzpdexugvfdqhfg` (eu-west-1, ACTIVE_HEALTHY)
- **Resend** : compte Kévin (DNS en attente — à check régulièrement)
- **EAS** : project `b2bdb0b9-18cf-40a6-be2c-c7dc1de3333c` (configuré dans `expo/app.json`)
- **Owner Expo** : `mortystream`
- **Bundle IDs** : `ch.mysteriaevent.intranet` (iOS + Android)

### Membres clés équipe

- **Kévin Perret** — admin principal, dev référent, président asso
- **Syndell Da Silva** — admin, secrétaire, testeuse iPhone (feedback UX précis)
- **Luana Roger** — admin, comité, testeuse, propose features
- **Salvatore Scuderi** — admin, comité, audit Claude externe mai 2026
- **Chloé Debons** — admin, vice-présidente
- **Loïc** — admin, trésorier
- **Yann Crittin** — admin, testeur
- **Elie** — admin, Pôle technique
- **Emilie** — `responsable_pole` Pôle Artistique (1er RP désigné en seed Vague B)
- **Bastien / Jennifer / Sébastien / Joël** — `responsable_secteur` (Pôle Artistique / Pôle technique)
- **Membres lambda** : Anne-Cécile, Ed, Jérémy, Manon, Mélissa, Sacha, Stéphanie

### Architecture rappelée (cf. `.claude/architecture.md` pour le détail)

- React Native 0.81 / Expo SDK 54 / Expo Router file-based
- Zustand persist + AsyncStorage côté front
- Supabase Postgres + Auth + Storage + Realtime + 2 Edge Functions Deno
- Custom Supabase client dans `expo/utils/supabase.js` avec cache JWT mémoire (cf. Hard Lesson §5.2)
- Conventions DB : colonnes `camelCase` (toujours quoter `"createdAt"` etc.)
- Hiérarchie organisationnelle : Comité → Pôles (5 fixes) → Secteurs (modulaires) → Membres
