# Roadmap, état courant & contacts

> État du projet, prochaines étapes, ressources externes. À lire pour planifier une nouvelle feature, comprendre où on en est, ou trouver un contact.

---

## État courant (post-V3b, 2026-05-03)

### ✅ Livré et testé sur device

**Sécurité** — Mode Preview supprimé, RLS Phase 1+2 strict, password change Supabase auth réel, leaked password sécurité activée (Free tier limité), JWT propagation fix, **collision storageKey GoTrueClient/Zustand persist résolue** (fix critique auto-login), **credentials en clair AsyncStorage retirés** (SEC-003 audit).

**UX cosmétique** — Chevron menu sidebar, version dynamique, émojis harmonisés, welcome card masquée par défaut, calendrier lundi-dimanche, bouton retour sur sous-pages, ParticipantsStack avec bottom sheet, **Toast custom dark/light** (toastConfig), **Skeleton shimmer wave gradient**, **Calendar cellules minHeight 44 + indicateur "+N" events**.

**Flows core** — RSVP visible en haut event-detail + badge "À répondre" home, **notifications cliquables avec deep-link réel** (event/task/category, plus le bug `taskId` colonne manquante), checkbox inline tâches, recherche universelle La Bible, onboarding 3 écrans first launch.

**Notifications (refonte complète v1.4)** :
- Tap → deep-link + auto-mark-read (1 seul chemin, plus de double routing)
- Long-press menu pour TOUS users (avant : admin only)
- ConfirmModal au lieu d'Alert.alert
- SectionList groupé par jour (Aujourd'hui / Hier / Cette semaine / Plus ancien)
- Empty state riche, skeleton 1er chargement
- Distinction lue/non-lue marquée (border-left coloré + bold)
- Notifs obsolètes grisées avec badge "Tâche terminée" / "Événement passé"
- **Toast in-app style WhatsApp** : slide-down du haut quand notif Realtime arrive, swipe-up dismiss, auto 4.5s, tap → deep-link
- **Bug critique UUID id résolu** : avant, `addNotification` générait des ids string non-UUID → INSERT échouait silencieusement → 0 notif en DB depuis toujours. Maintenant `uuid v4` + `crypto.randomUUID()` côté Edge.
- Edge function `scheduled-reminders` v3 déployée (titres courts ≤ 22 chars)

**Auto-login** — Plus besoin de se reco à chaque ouverture (cold start). Tolérance erreurs transitoires. Plus de bouton "Connexion rapide" / toggle "Mémoriser identifiants" dans login.tsx (auto-login Supabase suffit).

**Realtime (v1.3)** — `@supabase/realtime-js` intégré dans le custom client. Migration `enable_realtime_on_tasks` + `notifications_task_id_and_realtime`. Sync globale tasks INSERT/UPDATE/DELETE entre devices. Commentaires temps réel. Indicateur "X est en train d'écrire..." (broadcast). Réactions emoji 👍❤️🙏😂. **RPC `toggle_comment_reaction`** atomique (SELECT FOR UPDATE) pour éliminer race condition reactions simultanées.

**Sync différée offline (v1.3)** — `pending-queue-store` + `queue-worker.ts`. Toggle tâche / addComment / réaction (via RPC) / RSVP enqueués si offline (optimistic préservé). Drain auto au retour online + au démarrage app.

**Search + filtres tâches (v1.3 / #7-#8)** — Search bar tâches (titre/description/catégorie/assignés). 5 chips combinables : Mes / Que j'ai créées / Catégorie / Priorité haute / En retard.

**Qualité images** — Compression avatars/screenshots/Bible, sanitize filenames, vrai aperçu image dans form.

**Performance** — `React.memo` sur `TaskItem`, `NotificationItem`, `UserListItem`. `getEventsByDate` memoïsé. Signature stable pour `syncLocalReminders` deps (plus de cascade re-fire). Intercepteur 401 → refresh → retry sur custom Postgrest client (mutex partagé).

**Audit Salvatore (mai 2026)** — 29/50 items traités (62%), 2 skip volontaires (web-only), 19 restants. Détail complet item par item avec ✅/⏭/❌ : `.claude/archive/audit-salvatore-mai-2026.md`. Les gros morceaux restants (auth-store refactor, expo-secure-store, @gorhom/bottom-sheet, tests Jest baseline) sont aussi listés dans la table "Long terme" plus bas.

### 🟡 Bugs résiduels connus

1. **Pas de tests automatisés** : aucun test unit/integration en place (cible V3c — Jest baseline sur stores critiques)
2. **`supabase-users-store.ts` doublon** avec `users-store.ts` — toujours là, consommé uniquement par `admin/database.tsx` (panel legacy). Refactor demande de toucher aussi à database.tsx, à faire en session dédiée.

### ⏸️ En attente externe

- **DNS Resend** : `mysteriaevent.ch` chez Webland.ch — à check régulièrement, quand vert → rebrancher Edge Function `send-bug-email` côté `settings.tsx`.
- **EAS Build** : sortie d'Expo Go nécessaire pour activer push remote vraies + Quick Actions + Widgets.

---

## 🔥 Priorités prochaines sessions

### Court terme (S/M effort)

1. **Pièces jointes aux tâches** (PDF, image, lien) — très demandé par l'asso. Impact daily.
2. **Mentions @user dans commentaires** — déjà roadmap, gros impact UX collaboratif.
3. **Récurrence d'événements** (réunion mensuelle auto) — RRULE simple suffit.
4. **Drafts / sauvegarde auto des forms** — si user ferme TaskForm en pleine saisie, tout est perdu (Notion / Linear sauvent).
5. **Mode "ne pas déranger"** / Quiet hours — toggle horaire dans Settings.

### Tâches : panel équipe responsables + workflow validation cross-secteur (✅ livré 2026-05-05)

Modélisation Pôle → Secteur → Membre + workflow validation. 6 commits, en 2 vagues.

**Vague B — Panel "vue d'équipe" pour responsables** (livré commits `69ba614` / `4ed8f75` / `6f6bdd8`)
- Modélisation DB : tables `sectors` + `sector_members`, colonne `user_groups.responsibleId`, helpers `private.is_pole_responsible`, `is_sector_responsible`, `user_team_user_ids`. Cf. migration `vague_b_phase1_sectors_modeling`.
- Panel admin `/admin/sectors` : CRUD secteurs par pôle, assignation membres, désignation RS/RP.
- Bouton 👥 dans le Header de l'onglet tâches (admin/RP/RS) → écran `/team-tasks` avec tâches groupées par membre, tri par "tâches en retard" décroissant, filtres status + sheet priorité/retard.

**Vague C — Workflow validation cross-secteur** (livré commit suivant)
- ALTER `tasks` : `approvalStatus`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`.
- Trigger BEFORE INSERT auto-set : si actor n'a pas autorité sur AU MOINS un assignee (ni admin, ni RP du pôle, ni partage de secteur), status devient `pending_approval`.
- RPC `tasks_pending_my_approval()` : retourne les tâches que JE peux valider (RS d'un secteur d'un assignee OU RP du pôle).
- RPC `approve_task` / `reject_task` (avec raison optionnelle) : sécurisées par check authorization côté DB.
- Côté front : badge "En attente d'approbation" dans TaskDetail, boutons Approuver/Rejeter pour les validateurs, modal raison de rejet, section "À valider (N)" en tête de l'onglet tâches, notifs dédiées (RS reçoit "Tâche à valider", créateur reçoit "Approuvée"/"Rejetée").
- Filtre côté client : un assigné ne voit pas une tâche `pending_approval` dans sa liste classique tant qu'elle n'est pas approuvée (créateur la voit toujours via `assignedBy`).
- ⚠️ Limite connue : pas de RLS strict pour cacher `pending_approval` aux assignés au niveau DB (filtre client only). À serrer en session sécurité dédiée si besoin.

### Long terme — gros refactors L effort

| Item | Pourquoi |
|---|---|
| **Refactor `auth-store.ts`** (1061 lignes → ~600 avec helper unique) | Code critique, dupliqué 3x sur le lookup user. Mérite tests serrés sur device. |
| **`expo-secure-store`** pour auth-state + tokens | Sécurité tangible. Limite iOS Keychain ~2KB/clé à valider avant. |
| **Dédoublonner `users-store` vs `supabase-users-store`** | `admin/database.tsx` consomme le legacy. Refactor en chaîne. |
| **`@gorhom/bottom-sheet`** | Refactor UI sur 3 composants (TaskDetail, reaction picker, ParticipantsStack). |
| **Tests Jest baseline** | 4-6h juste pour le setup + premiers tests sur auth/tasks. |
| **EAS Build production** | Active push remote, Quick Actions (#10 audit features), Widgets (#13 audit features). |

### Compte démo & App Store

- Compte démo + App Review Notes à préparer pour soumission App Store / Play Store
- Bundle IDs prêts : `ch.mysteriaevent.intranet` (iOS + Android)
- EAS project configuré : `b2bdb0b9-18cf-40a6-be2c-c7dc1de3333c`

### 🎯 Idées features futures (à valider avec l'asso)

- **Catégorie privée pour events** (visible seulement par membres listés) — partiellement implémentable via `restrictedAccess` mais pas exposé pour events
- **Calendar export .ics** (pour importer dans Google/Apple Calendar natif)
- **Dashboard stats admin** plus poussé
- **Recherche globale cross-modules** (tâches + events + Bible + users dans une seule barre style Slack `Cmd+K`)
- **Indicateur "vu"/"reçu" sur les notifs** (style WhatsApp)
- **Onboarding contextuel** (tooltips premier usage — long-press = supprimer caché actuellement)
- **Quick filters sauvegardés** sur Tâches (les chips combinables doivent être ré-appliqués à chaque session)

---

## ⚠️ NE PAS FAIRE (rappel)

Liste exhaustive dans `hard-lessons.md`. Top 5 critique :

- Réintroduire un Mode Preview / fallback auto-loggué (§5.1)
- Faire un INSERT auto-create dans le flow login (§5.4)
- Appeler `reinitializeSupabase()` dans un retry path (§5.3)
- Mettre des policies RLS avec rôle `anon`
- Chaîner deux `ConfirmModal` dont le 2ème dépend du state du 1er (§5.18)

---

## 🛠️ Commits récents (2026-05-02 → 03)

Le git log est la source de vérité primaire. Ordre approximatif (les hashes peuvent diverger après push) :

| Commit | Sujet |
|---|---|
| `bb35a0f` | docs: setup CLAUDE.md and sync project state |
| `9464e25` | fix: audit Salvatore (BUG-002/003/005/006 + SEC-004 + BUG-004) |
| `6736612` | docs: explain why supabase client is custom |
| `56472d9` | feat: notifications refonte + auto-login fix + audit V1 polish |
| `2ae4434` | fix: V2 audit - bugs réels + perf + types + UX modern |
| `f091bef` | fix: V3a audit - bugs S/M + UX polish + dette tech ciblée |
| `89e4a7f` | fix: V3b - intercepteur 401 + cleanup mort code |
| `e3cb09a` | fix: BUG CRITIQUE notifs UUID + offline + UX Toast création tâche/event |
| `d79d49c` | feat: Toast custom avec dark/light mode + Alert validation forms en Toast |
| `0649d1a` | chore: backup before CLAUDE.md modularization |

---

## 📞 Contacts & Ressources

- **GitHub** : [github.com/MortyStream/mysteria-app](https://github.com/MortyStream/mysteria-app)
- **Supabase Dashboard** : project `toefttzpdexugvfdqhfg` (eu-west-1)
- **Resend** : compte Kévin (en attente DNS)
- **EAS** : project `b2bdb0b9-18cf-40a6-be2c-c7dc1de3333c` (configuré dans `expo/app.json`)
- **Owner Expo** : `mortystream`
- **Bundle IDs** : `ch.mysteriaevent.intranet` (iOS + Android)

### Membres clés équipe

- **Kévin Perret** (admin principal, dev référent)
- **Syndell Da Silva** (admin, testeuse iPhone — feedback UX précis)
- **Luana Roger** (admin, testeuse — propose features)
- **Salvatore Scuderi** (admin, audit Claude externe mai 2026), **Chloé Debons** (admin)
- **Yann Crittin** (admin, testeur)
