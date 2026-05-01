# CLAUDE.md — Mystéria Event Intranet

> **Source of Truth** pour le projet. Lire en intégralité avant toute modification.
> Mis à jour : 2026-05-02 (post v1.3 — features 7, 8, 9, 11, 12 du roadmap des 13)

---

## 1. PROJECT VISION

**Mystéria Event** est une **association suisse à but non lucratif** (théâtre / événementiel culturel, ~30 membres actifs).

L'app **MysteriaPP** est leur **intranet mobile privé** : pas d'inscription publique, comptes créés par les admins. Distribuée à terme via App Store + Play Store pour les iOS et Android des membres.

**Use cases couverts** :
- 📋 **Tâches** collaboratives (assigner, suivre, commenter, deadlines, complétion tracée)
- 📅 **Calendrier d'événements** (réunions, représentations, RSVP)
- 📚 **La Bible** (procédures internes, fichiers PDF/Word/images, dossiers, liens externes)
- 👥 **Annuaire** des membres
- 🔗 **Liens importants** (Drive partagé, sites externes)
- 🔔 **Notifications** in-app + push + locales
- ⚙️ **Réglages** (apparence, profil, mot de passe, signaler bug)
- 🛠️ **Panneau d'administration** (gestion users, catégories, groupes, permissions, stats)

**Pôles fonctionnels de l'asso** : Artistique, RH, Technique, Business, Administration, Comité (catégories Bible + tags d'events).

**Public visé** : interne — MAIS l'app sera soumise à l'App Store. Le compte démo + Review Notes sont à préparer (cf. section App Store dans NEXT STEPS).

---

## 2. TECH STACK & TOOLS

### Frontend mobile

| Composant | Version | Rôle |
|---|---|---|
| **React Native** | 0.81 (via Expo SDK 54) | UI native iOS + Android |
| **Expo SDK** | `54.0.0` | Build/dev environment |
| **Expo Router** | `~6.0.23` | File-based routing |
| **TypeScript** | strict (config Metro) | Types — Metro **ne fait PAS de typecheck strict**, types `any` partout possibles |
| **Zustand** | latest + `persist` middleware | State management |
| **AsyncStorage** | `@react-native-async-storage/async-storage` | Persistance locale Zustand + Auth |

### Libs Expo essentielles

| Lib | Version | Usage |
|---|---|---|
| `expo-image-picker` | `~17.0.10` | Galerie photos (avatar, screenshots, image Bible) |
| `expo-document-picker` | `~14.0.8` | Sélection fichiers (PDF, Word, etc.) |
| `expo-image-manipulator` | `^55.0.15` | Compression images (1024px max, 0.7 quality) |
| `expo-image` | `~3.0.11` | Affichage images optimisé |
| `expo-haptics` | `~15.0.8` | Vibrations Taptic Engine (succès, warning, tap) |
| `expo-notifications` | `^0.32.16` | Push notifications + local notifications |
| `expo-mail-composer` | `^55.0.13` | Compose mail (bug report fallback) |
| `expo-file-system/legacy` | `~SDK54` | **IMPORTANT : l'API classique est dépréciée, importer depuis `/legacy`** |
| `expo-sharing` | (installé via npm) | Share sheet native (ouverture fichiers Bible) |
| `expo-linear-gradient` | `~15.0.8` | Gradients UI (boutons home, etc.) |
| `expo-haptics` | `~15.0.8` | Feedback tactile |
| `expo-constants` | `~18.0.13` | Détection Expo Go vs prod build |
| `expo-updates` | `^55.0.21` | OTA updates (EAS Update à configurer) |

### Libs RN tierces

| Lib | Usage |
|---|---|
| `lucide-react-native` | Icônes — **toujours préférer Lucide à autres icon sets** |
| `react-native-toast-message` | Toasts (erreurs, succès) — déjà branché dans `_layout.tsx` |
| `react-native-safe-area-context` | Insets safe area (notch iPhone, status bar Android) |
| `react-native-gesture-handler` | Wrapping root pour gestures |
| `@react-native-community/netinfo` | Détection online/offline (utilisée par OfflineBanner) |

### Backend

| Composant | Détails |
|---|---|
| **Supabase** | Project ID: `toefttzpdexugvfdqhfg` (region eu-west-1) |
| **Supabase Auth** | Email/password, JWT-based |
| **Postgres** | Tables principales : `users`, `tasks`, `events`, `notifications`, `resource_categories`, `resource_items`, `external_links`, `category_members`, `user_groups`, `user_group_members`, `directory_profiles`, `push_tokens`, `bug_reports`, `conversations` (unused), `messages` (unused) |
| **Storage buckets** | `avatars` (public), `bug-reports` (public), `resources` (public, fichiers Bible) |
| **Edge Functions** | Deno runtime, 2 fonctions : `send-bug-email`, `scheduled-reminders` |
| **pg_cron + pg_net** | Activés, utilisés pour planifier `scheduled-reminders` toutes les 15 min |
| **Resend** | Service email pour `send-bug-email` (en attente DNS `mysteriaevent.ch` côté Webland) |
| **Realtime** | Publication `supabase_realtime` activée sur `tasks` (REPLICA IDENTITY FULL) — diffuse INSERT/UPDATE/DELETE via WebSocket pour la sync live des commentaires + liste des tâches |

### Custom Supabase Client — **IMPORTANT**

L'app **n'utilise PAS le SDK officiel `@supabase/supabase-js`** mais un **client custom** dans `expo/utils/supabase.js` qui combine :
- `GoTrueClient` (de `@supabase/auth-js`) pour Auth
- `PostgrestClient` (de `@supabase/postgrest-js`) pour DB
- `RealtimeClient` (de `@supabase/realtime-js`) pour les souscriptions WebSocket — partage le JWT avec Postgrest via `setAuth()` synchronisé dans `cacheAccessToken()`
- Implémentation maison de Storage (fetch direct vers `/storage/v1/object/...`)

**Pourquoi custom** : moins de bundle size + contrôle total des headers + cache JWT mémoire (cf. Hard Lessons).

### Commandes de dev

```powershell
# Démarrage serveur (depuis expo/)
cd C:\Users\MOOKI\rork-myst-ria-intranet\expo
npx expo start --tunnel --clear

# Install d'un package (toujours --legacy-peer-deps à cause du conflit React 19)
npm install <package> --legacy-peer-deps

# Reload sur device : secouer le téléphone → Reload
# Hard reload : Ctrl+C sur le serveur puis relancer avec --clear
```

### Sauvegarde Git

```powershell
# Repo : github.com/MortyStream/rork-myst-ria-intranet
# Branch : main
# Tags : v1.0-28.04.26, v1.1-29.04.26, v1.2-30.04.26
# Restoration : git checkout v1.X-DD.MM.AA
```

Le worktree `.claude/worktrees/...` était utilisé en début de session puis supprimé. **On bosse direct dans le origin repo `C:/Users/MOOKI/rork-myst-ria-intranet`**.

---

## 3. ARCHITECTURE GLOBALE

### Arborescence racine

```
rork-myst-ria-intranet/
├── CLAUDE.md                    ← ce fichier
├── .gitignore
├── expo/                        ← l'app principale
│   ├── app.json                 ← config Expo (bundle ID ch.mysteriaevent.intranet)
│   ├── package.json
│   ├── app/                     ← Routes Expo Router (file-based)
│   ├── components/              ← Composants réutilisables
│   ├── store/                   ← Zustand stores
│   ├── utils/                   ← Helpers (supabase, push, haptics, etc.)
│   ├── types/                   ← Types TS (parfois mal exportés, voir Hard Lessons)
│   ├── constants/               ← Colors, etc.
│   └── assets/                  ← Images statiques
├── supabase/                    ← Edge Functions Deno
│   └── functions/
│       ├── send-bug-email/
│       └── scheduled-reminders/
├── scripts/                     ← Auto-backup PowerShell (optionnel)
└── .claude/                     ← Session data Claude Code (gitignored)
```

### Routing Expo Router (`expo/app/`)

```
app/
├── _layout.tsx                  ← Root : init auth, push tokens, OfflineBanner, sync local notifs, badge app
├── index.tsx                    ← Redirect : login/onboarding/home selon état auth
├── login.tsx                    ← Écran de login (utilise cacheAccessToken après signInWithPassword)
├── onboarding.tsx               ← 3 slides au premier launch après login
├── home.tsx                     ← Dashboard (greeting + grille accès rapides + tâches/events à venir)
├── tasks.tsx                    ← Mes tâches (filtres Toutes/À faire/Terminées + long-press delete)
├── notifications.tsx            ← Liste notifs avec swipe + abonnements catégories
├── directory.tsx                ← Annuaire users avec search
├── resources.tsx                ← La Bible main (search universelle + grille catégories)
├── links.tsx                    ← Liens externes
├── settings.tsx                 ← Réglages + signaler bug
├── calendar/
│   ├── _layout.tsx
│   ├── index.tsx                ← Calendrier (Calendar component + events du jour + long-press delete)
│   ├── event-form.tsx           ← Création/édition event
│   └── event-detail.tsx         ← Détail event + RSVP
├── profile/
│   ├── index.tsx                ← Mon profil
│   ├── edit.tsx                 ← Édition profil + upload avatar
│   └── change-password.tsx      ← Changement mdp (vraie Supabase auth)
├── resources/
│   └── [id].tsx                 ← Détail catégorie Bible avec items + cache files
├── user/
│   └── [id].tsx                 ← Profil d'un autre user
└── admin/                       ← Panneau admin (réservé admin/responsable_pole)
    ├── index.tsx
    ├── user-form.tsx            ← ⚠️ utilisé pour créer users (pas supabase-user-form)
    ├── users.tsx
    ├── categories.tsx
    ├── category-form.tsx
    ├── groups.tsx
    ├── group-form.tsx
    ├── link-form.tsx
    ├── links.tsx
    ├── notifications.tsx
    ├── notification-form.tsx
    ├── permissions.tsx
    ├── resource-item-form.tsx   ← Création/édition item Bible (file/image/link/text/folder)
    ├── stats.tsx
    ├── tasks.tsx
    ├── appearance.tsx
    ├── database.tsx
    └── database-config.tsx
```

### Composants clés (`expo/components/`)

| Composant | Rôle |
|---|---|
| `Header.tsx` | Header avec back button + title + chevron sidebar + rightComponent. Used partout. |
| `AppLayout.tsx` | Wrapper avec Sidebar slide-in. Utilisé sur les **pages principales** (home, tasks, calendar, etc.) — **pas sur les sous-pages** |
| `SideBar.tsx` | Menu lateral coulissant |
| `SplashScreen.tsx` | Écran de chargement initial |
| `Calendar.tsx` | Composant calendrier mensuel custom (semaine **lundi-dimanche**) |
| `TaskItem.tsx` | Card de tâche avec checkbox round + checkbox pour marquer fait |
| `TaskDetail.tsx` | Modal de détail d'une tâche avec commentaires + KeyboardAvoidingView |
| `TaskForm.tsx` | Form création/édition tâche (utilise ParticipantsStack) |
| `OfflineBanner.tsx` | Toast pill compact en bas + hooks/exports `useIsOnline()`, `getIsOnline()` (sync), `onNetworkTransition(cb)`. Affiche aussi le compteur d'actions en attente de sync |
| `ConfirmModal.tsx` | Dialog custom pour confirmations (remplace Alert.alert moche). ⚠️ **NE PAS chaîner deux instances** : `onDismiss` est appelé synchroniquement avant `action.onPress` (cf. Hard Lesson 5.18) |
| `ParticipantsStack.tsx` | Stack d'avatars chevauchants + bottom sheet (au lieu de longue liste de chips) |
| `Skeleton.tsx` | Rectangle gris pulsé + variants (`TaskItemSkeleton`, `CategoryRowSkeleton`, `UserRowSkeleton`) pour 1er chargement |
| `Avatar.tsx` | Avatar circulaire avec initiales fallback |
| `Card.tsx` | Card de base avec ombre |
| `Button.tsx` | Bouton multi-variants (primary, outline, text) |
| `Input.tsx` | TextInput stylé |
| `Badge.tsx` | Badge coloré (rôles users) |
| `EmptyState.tsx` | État vide avec icône + message + action |
| `ListItem.tsx` | Row de liste (settings, etc.) |
| `Divider.tsx` | Trait de séparation |
| `NotificationItem.tsx` | Card de notification |
| `UserListItem.tsx` | Row d'user pour annuaire |
| `ResourceItemList.tsx` | Liste d'items dans une catégorie Bible |

### Stores Zustand (`expo/store/`)

| Store | Persisté ? | État principal |
|---|---|---|
| `auth-store.ts` | ✅ (storageKey `mysteria-auth-storage` v2) | `user`, `isAuthenticated`, `storedCredentials` |
| `tasks-store.ts` | ✅ (`tasks-storage-v2`) | `tasks`, `remindersSent` |
| `calendar-store.ts` | ✅ (`calendar-storage-v2`) | `events` |
| `notifications-store.ts` | ✅ (`mysteria-notifications-storage`) | `notifications`, `isMessagingEnabled` |
| `resources-store.ts` | ✅ | `categories`, `resourceItems`, `externalLinks` |
| `users-store.ts` | ✅ | `users` (annuaire complet) |
| `settings-store.ts` | ✅ | `darkMode`, `persistLogin`, `welcomeMessage`, `hasSeenOnboarding`, etc. |
| `user-groups-store.ts` | ✅ (`user-groups-storage-v1`) | `groups` (liste groupes Comité, RH, etc.) |
| `supabase-roles-store.ts` | ✅ | (legacy, peu utilisé) |
| `supabase-users-store.ts` | ✅ | (legacy/dupliqué avec users-store) |
| `pending-queue-store.ts` | ✅ (`mysteria-pending-queue-v1`) | `actions: PendingAction[]` — file FIFO des actions offline à rejouer (toggle tâche, comment, réaction, RSVP) |

**Note sur `tasks-store.ts`** : exporte aussi `startTasksRealtimeSync()` / `stopTasksRealtimeSync()` (module-level, pas dans le store). Branchés au login/logout dans `_layout.tsx` pour la sync globale Realtime des INSERT/UPDATE/DELETE.

**⚠️ Pattern de toutes les fonctions `initialize*`** :

```typescript
initializeXxx: async () => {
  set({ isLoading: true });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchFromSupabase();
      set({ items: data, isLoading: false });
      return;
    } catch (err) {
      console.log(`Erreur (tentative ${attempt}):`, err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 200 * attempt));
      } else {
        set({ isLoading: false });
      }
    }
  }
}
```

### Utils (`expo/utils/`)

| Fichier | Exports |
|---|---|
| `supabase.js` | `getSupabase()`, `cacheAccessToken()` (propage aussi le JWT au RealtimeClient), `getCachedAccessToken()`, `syncUserWithSupabase()`, `subscribeToTasksList({onInsert, onUpdate, onDelete})`, `subscribeToTask(taskId, onUpdate)`, `subscribeToTaskTyping(taskId, {onTyping})`, `reinitializeSupabase()` (⚠️ NE PAS UTILISER, voir Hard Lessons) |
| `push-notifications.ts` | `registerPushToken(userId)`, `unregisterPushToken(userId)`, `sendPushNotifications(userIds, title, body, data)` |
| `local-notifications.ts` | `syncLocalReminders(tasks, events, userId)`, `clearAllLocalReminders()`, `setAppBadge(count)`, `clearAppBadge()` |
| `file-cache.ts` | `getCachedOrDownload(itemId, remoteUrl)`, `isFileCached(itemId, remoteUrl)`, `clearCache()`, `formatBytes()` |
| `image-compression.ts` | `compressImage(uri, options)`, `sanitizeFilename(name)` |
| `haptics.ts` | `tapHaptic()`, `mediumHaptic()`, `successHaptic()`, `warningHaptic()`, `errorHaptic()`, `selectionHaptic()` |
| `date-utils.ts` | `formatDate`, `formatRelativeDate` (utilisés dans TaskDetail + NotificationItem) |
| `queue-worker.ts` | `flushPendingQueue()`, `triggerFlush()` — drain la file `pending-queue-store` quand online. Idempotent par type d'action, retry 5x avec abandon, re-fetch des listes uniquement si queue entièrement vidée |

### Communication client ↔ serveur

```
   App (React Native)
        │
        │ 1. signInWithPassword(email, pwd)
        │ 2. cacheAccessToken(jwt)  ←── synchrone, immédiat
        │ 3. setSession({access, refresh})
        │
   getSupabase() (singleton)
        │
   custom fetch wrapper
        │
        │   Authorization: Bearer <_cachedAccessToken || anon_key>
        │   apikey: anon_key
        │
   Supabase REST/Storage
        │
   RLS (private.is_admin() etc.)
        │
   Postgres
```

**Au logout** :
- `cacheAccessToken(null)` (clear JWT mémoire)
- `clearAllLocalReminders()` (annule les notifs programmées)
- `clearAppBadge()` (reset badge icône)
- `supabase.auth.signOut()`
- `set({ user: null, isAuthenticated: false })`

### Edge Functions Supabase (`supabase/functions/`)

#### `send-bug-email/index.ts`
- Envoie un email via **Resend API**
- Reçoit `{ subject, body, screenshotUrls }`
- Construit HTML avec images embarquées
- Destinataire : `Kevin.perret@mysteriaevent.ch`
- **EN ATTENTE** : DNS `mysteriaevent.ch` chez Webland.ch — pas encore propagé. En attendant, l'app utilise `MailComposer` ou `mailto:` côté client.

#### `scheduled-reminders/index.ts`
- Tourne **toutes les 15 min via pg_cron**
- Vérifie tâches avec deadline dans 24h ± 20min ET 1h ± 20min
- Vérifie events avec startTime dans 1h ± 20min
- Pour chaque match : envoie push via Expo Push API + crée notification in-app
- **Déduplique via colonnes** : `tasks.reminder24hSentAt`, `tasks.reminder1hSentAt`, `events.reminder1hSentAt`
- Utilise `SUPABASE_SERVICE_ROLE_KEY` (env var Supabase)

---

## 4. CONVENTIONS DE CODE STRICTES

### Naming

| Type | Convention | Exemples |
|---|---|---|
| **Colonnes DB** | `camelCase` (PAS snake_case) | `supabaseUserId`, `createdAt`, `updatedAt`, `assignedTo`, `targetUserIds` |
| **Variables JS** | `camelCase` | `currentUser`, `isLoading` |
| **Composants React** | `PascalCase` | `TaskItem`, `OfflineBanner` |
| **Fichiers de composants** | `PascalCase.tsx` | `TaskItem.tsx` |
| **Fichiers utils** | `kebab-case.ts` | `local-notifications.ts`, `image-compression.ts` |
| **Stores** | `xxx-store.ts` | `tasks-store.ts`, `auth-store.ts` |
| **Fonctions SQL helpers** | `snake_case`, dans schéma `private` | `private.is_admin()`, `private.current_user_internal_id()` |

### TypeScript

- **Strict typing pas obligatoire** (Metro ne fait pas de typecheck strict)
- `as any` toléré pour résoudre vite, **mais à éviter** dans les nouvelles features
- `@/` alias pointe vers `expo/` (configuré dans tsconfig)
- Types dans `expo/types/` — ⚠️ `task.ts` ne contient PAS le type Task (corruption historique, à corriger un jour)

### State management

- **Zustand persist sur tous les stores** avec `partialize` pour ne pas serialize des fonctions
- **Initialize avec retry x3 backoff** sur tous les fetch initiaux
- **Optimistic UI obligatoire** sur les actions fréquentes (toggle tâche, RSVP, mark read)
- **Snapshot + rollback** sur erreur API + Toast d'erreur
- ⚠️ **Ne JAMAIS appeler `reinitializeSupabase()`** dans un retry (cf. Hard Lesson #4)

### UI/UX

- **Pas d'`Alert.alert` pour les confirmations destructives** → utiliser `<ConfirmModal>` (cf. components/)
- **Long-press 500ms** sur les items pour les actions secondaires (delete tâche, delete event)
- **Haptic feedback obligatoire** sur les actions confirmées :
  - `tapHaptic()` pour toggle / send commentaire
  - `successHaptic()` pour save / login / RSVP accepter
  - `warningHaptic()` pour suppression confirmée
  - `mediumHaptic()` pour ouverture menu long-press
- **Pas de haptic** sur navigation simple ou tap d'item (anti-fatigue tactile)
- **Toast `react-native-toast-message`** pour les feedback non bloquants (déjà branché dans `_layout.tsx`)
- **Couleurs via `theme`** (pas de hardcoded `#xxxxxx`) sauf dans buckets séparés (warning jaune, etc.)
- **Border radius standard** : `8` (input), `12` (small card), `16-18` (modal), `24` (pill toast)

### Storage / Files

- **Toujours sanitize les filenames** avant upload Supabase Storage (`sanitizeFilename()`) — sinon "InvalidKey 400"
- **Compresser les images** avant upload (`compressImage(uri, {maxWidth: 1024, quality: 0.7})`)
- **Cache local** pour les fichiers Bible via `getCachedOrDownload()`
- **`expo-file-system/legacy`** pas `expo-file-system` (deprecated en SDK 54)

### RLS / Security

- **Tous les helpers sécurité dans schéma `private`** (non exposé via PostgREST)
- **JAMAIS de policy avec rôle `anon`** (la porte d'entrée est `signInWithPassword`)
- **JAMAIS de fallback "user fantôme" / "preview admin"** (faille critique)
- **WITH CHECK strict** : `supabaseUserId = auth.uid()` ou `private.is_admin()`
- **Policy "first link"** : seule exception, permet UPDATE si `supabaseUserId IS NULL` ET `email = auth.jwt() ->> 'email'`

### Async patterns

- **`async/await`** plutôt que `.then()` (lisibilité)
- **`try/catch` obligatoire** sur tous les calls Supabase / réseau
- **Best-effort non bloquant** pour les opérations secondaires : `console.log` au lieu de `console.error`, ne pas re-throw
- **Re-throw** uniquement pour les opérations critiques (login, save user-facing)

### Comments

- **JSDoc** pour les fonctions exportées (utils, stores)
- **Commentaires en français** pour la logique métier (l'app est française, l'équipe aussi)
- **Préfixes descriptifs** dans les `console.log` : `[Push]`, `[LocalNotif]`, `[Badge]`, `[OfflineBanner]`

---

## 5. CRITICAL CONTEXT & HARD LESSONS

> **Cette section est la PLUS IMPORTANTE.** Lire avant toute modification touchant l'auth, RLS, Supabase, ou les stores.

### 5.1. ☠️ Mode Preview = Faille critique RÉSOLUE

**Symptôme historique** : N'importe qui pouvait taper email/mdp aléatoires et entrer en mode "Mode Preview" avec **rôle admin et toutes permissions**.

**Cause racine** : L'état initial Zustand contenait `user: PREVIEW_USER (role: admin), isAuthenticated: true`. Si le login échouait, ce state preview persistait → l'app considérait l'utilisateur authentifié.

**Solution appliquée** :
1. État initial du store auth = `user: null, isAuthenticated: false`
2. Suppression complète de `PREVIEW_USER`, `DEFAULT_ADMIN`, `DEFAULT_MODERATOR`, `createPreviewUser()`, `enablePreviewMode()`
3. Migration `persist` v2 : invalide tout state résiduel avec `user.id === 'preview-user'`
4. `clearAuthState()` (helper) appelé en cas d'échec d'init au lieu d'`enablePreviewMode()`

**🚨 NE JAMAIS** réintroduire un fallback "auto-loggué", même temporaire, même en dev.

### 5.2. ☠️ JWT propagation post-`signInWithPassword`

**Symptôme historique** : Login OK, mais ensuite "user fantôme" (Membre sans nom) ou TOUTES les pages vides (annuaire, tâches, calendrier).

**Cause racine** : `getSession()` du custom GoTrueClient peut retourner `null` immédiatement après `signInWithPassword` à cause d'un délai async d'écriture AsyncStorage. Pendant cette fenêtre (50-200ms surtout sur Android), le custom Postgrest fetch wrapper utilise la `SUPABASE_ANON_KEY` au lieu du JWT user → toutes les requêtes partent en mode anon → RLS bloque (puisque toutes les policies anon ont été supprimées en Phase 2) → 0 résultat retourné silencieusement.

**Solution appliquée** :
1. **Cache mémoire JS** dans `utils/supabase.js` : `let _cachedAccessToken = null`
2. **`cacheAccessToken(token)`** exporté, appelé **synchroniquement** après `signInWithPassword` dans `auth-store.ts`
3. Le fetch wrapper lit en priorité `_cachedAccessToken`, fallback `getSession()` ensuite
4. `setSession()` toujours appelé en parallèle pour mettre à jour le state interne du GoTrueClient
5. Au logout : `cacheAccessToken(null)` pour pas qu'un autre user récupère l'ancien token

**🚨 NE JAMAIS** retirer le cacheAccessToken sans avoir une vraie alternative testée.

### 5.3. ☠️ `reinitializeSupabase()` est destructif

**Symptôme historique** : Toutes les pages vides après login. L'annuaire fait un retry qui crée un nouveau client global sans session, ce qui casse tous les autres stores qui partagent le singleton.

**Cause racine** :
```typescript
// users-store.ts AVANT :
catch (err) {
  reinitializeSupabase();  // ← crée un nouveau client global
  retry();                  // ← le nouveau client n'a pas la session
}
```

Le nouveau auth client charge la session **asynchrone** depuis AsyncStorage. Pendant ce temps, tous les autres stores qui font `getSupabase()` reçoivent le client cassé.

**Solution appliquée** :
- **Pas de `reinitializeSupabase()` dans les retry**
- Retry simple avec `setTimeout(200 * attempt)` x 3 tentatives
- Le client garde sa session, le retry réussit la plupart du temps

**🚨 NE JAMAIS** appeler `reinitializeSupabase()` ailleurs que dans le menu admin de config Supabase. C'est réservé à des cas extrêmes.

### 5.4. ☠️ 3 sources d'INSERT sur `users` qui créaient des fantômes

**Symptôme historique** : Erreurs RLS 42501 lors du login + user fantôme.

**Cause racine** : 3 endroits différents tentaient de créer un nouvel user en DB :
1. `linkUserProfileWithSupabaseAuth` ligne 302 (fallback "no profile found")
2. `syncUserWithSupabase` upsert qui pouvait INSERT
3. `login()` ligne 855 (fallback "no profile found at all")

**Quand le JWT n'était pas propagé** (cf. 5.2), ces INSERT échouaient car la WITH CHECK RLS exigeait `supabaseUserId = auth.uid()` mais `auth.uid()` était NULL.

**Solution appliquée** :
- **Aucun INSERT sur `users` dans le flow login**. Les profils sont créés EXCLUSIVEMENT par les admins via `/admin/user-form`.
- `linkUserProfileWithSupabaseAuth` est devenu **best-effort** : cherche par supabaseUserId puis par email (case-insensitive `ilike`), update si trouvé sans supabaseUserId, sinon retourne false silencieusement
- `syncUserWithSupabase` cherche d'abord la row, update juste `updatedAt` si trouvée, return en non-bloquant sinon
- Le fallback dans `login()` est supprimé

**🚨 NE JAMAIS** réintroduire un INSERT auto-create dans le flow login. Sécurité ET cohérence des données.

### 5.5. ☠️ `Alert.alert` est moche sur Android

**Symptôme** : Popup blanc carré système Android, pas du tout aligné sur le thème dark de l'app.

**Solution** : Composant `<ConfirmModal>` custom (`expo/components/ConfirmModal.tsx`) :
- Modal transparent + backdrop semi-transparent (`rgba(0,0,0,0.55)`)
- Card centrée arrondie 18px max-width 360px
- Boutons stylés : `cancel` (gris), `primary` (couleur app), `destructive` (rouge `theme.error`)
- Tap-outside-to-close
- Animation fade

**Pattern destructive 2-step** :
1. Modal "Que voulez-vous faire ?" → bouton `[Annuler] [Supprimer]`
2. Si user clique "Supprimer" → 2ème modal "Vraiment ?" avec compteur d'impact si pertinent

### 5.6. ☠️ iOS PHPicker bloqué (image picker)

**Symptôme historique** : Sur iOS, le picker d'image affichait un checkmark sur la photo mais aucun bouton "Add" → user bloqué dans le PHPicker, impossible de fermer.

**Cause racine** : Sans `selectionLimit: 1` explicite + `allowsMultipleSelection: false`, iOS basculait en mode multi-select avec UI inadéquate.

**Solution appliquée** : **TOUJOURS** ces options pour `expo-image-picker` :
```typescript
{
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: false,
  selectionLimit: 1,
  allowsEditing: false,    // sinon iOS demande crop confirm = lourd
  exif: false,              // évite memory issues sur grosses photos
  base64: false,
}
```

### 5.7. ☠️ Supabase Storage InvalidKey

**Symptôme historique** : Upload de fichier "26.04.15_PV Réunion Mystéria signé.pdf" → erreur 400 "Invalid key".

**Cause racine** : Supabase Storage rejette les keys avec **espaces, accents, caractères spéciaux**.

**Solution appliquée** : Fonction `sanitizeFilename()` dans `utils/image-compression.ts` :
- Normalize NFD + retire les diacritiques
- Remplace tout caractère non `[A-Za-z0-9._-]` par `_`
- Préserve l'extension
- Limite à 100 chars

**🚨 TOUJOURS** appeler `sanitizeFilename()` sur le filename utilisateur avant upload.

### 5.8. ☠️ UUID empty string `""` en Postgres

**Symptôme historique** : Création d'un item Bible → erreur Postgres 22P02 "invalid input syntax for type uuid: ''".

**Cause racine** : Quand `parentId` est `undefined`/`null`, expo-router `params` peut le passer comme string `""`. Les colonnes UUID Postgres rejettent les strings vides.

**Solution appliquée** :
1. **Côté form** : `const parentId = rawParentId && rawParentId !== '' ? rawParentId : null`
2. **Côté store** : `sanitizeUuid()` helper dans `addResourceItem` qui convertit `""` → `null`

**🚨 TOUJOURS** sanitize les UUIDs nullables avant un INSERT/UPDATE Supabase.

### 5.9. ☠️ `expo-file-system` API déprécié SDK 54

**Symptôme historique** : Erreur `Method getInfoAsync imported from "expo-file-system" is deprecated`.

**Solution** : `import * as FileSystem from 'expo-file-system/legacy'` (avec `/legacy`).

La nouvelle API File/Directory est plus performante mais demande un refactor non prioritaire.

### 5.10. 🟠 Calendrier US par défaut

**Solution** : `weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']` + `getFirstDayOfMonth()` retourne 0=Lun ... 6=Dim au lieu du défaut JS (0=Dim).

### 5.11. 🟠 Expo Go SDK 53+ ne supporte pas les push remote

**Limitation connue** : `expo-notifications` (mode remote push) ne fonctionne PAS dans Expo Go depuis SDK 53. Les **local notifications** marchent.

**Workaround actuel** : Notifications locales programmées sur le device (`syncLocalReminders()`). Pour les push remote en prod : **EAS Build requis** (TODO).

**🚨 NE PAS prétendre que les push remote marchent en testant via Expo Go.** L'utilisateur l'a appris à ses dépens.

### 5.12. 🟠 Toast d'erreur OfflineBanner sur Android

**Bug résiduel signalé** : Quand un user est offline et toggle une tâche → toast d'erreur (cohérent avec le rollback) mais le style natif Android est moche (signalé non screenshoté).

**À investiguer** : la lib `react-native-toast-message` peut avoir un theme dark mal configuré.

### 5.13. 🟠 Bottom-sheet pas natif

`ParticipantsStack.tsx` utilise un `Modal` simple comme bottom sheet. Pour un vrai bottom sheet drag/swipe, on pourrait utiliser `@gorhom/bottom-sheet` mais c'est un gros refactor — pas prioritaire.

### 5.14. 🟠 Edge Function `send-bug-email` en attente DNS

DNS Resend pour `mysteriaevent.ch` chez **Webland.ch** pas encore propagé (signal de l'utilisateur). En attendant, l'app utilise `MailComposer` côté client. À rebrancher quand le statut Resend passe au vert.

### 5.15. 🟠 Push tokens registration silencieux

`registerPushToken(userId)` peut échouer silencieusement si :
- L'user a refusé la permission notifications iOS
- L'app tourne sur Expo Go SDK 53+
- AsyncStorage défaillant

Le login ne bloque pas dessus. Conséquence : les push remote ne partent pas pour cet user. **Acceptable** tant qu'on est en Expo Go.

### 5.16. 🟢 Pattern Optimistic UI

**Toujours** ce pattern pour les actions fréquentes :

```typescript
const previousState = get().items;
set({ items: optimisticUpdate(previousState) });

try {
  const data = await supabase.from('table').update(...).eq('id', id).select().single();
  if (error) throw error;
  set({ items: state.items.map(i => i.id === id ? data : i) }); // reconcile
} catch (err) {
  set({ items: previousState }); // rollback
  Toast.show({ type: 'error', text1: 'Erreur', text2: '...' });
  throw err;
}
```

### 5.17. 🟢 Pattern initialize* avec retry

```typescript
initializeXxx: async () => {
  set({ isLoading: true });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchFromSupabase();
      set({ items: data, isLoading: false });
      return;
    } catch (err) {
      console.log(`Erreur (tentative ${attempt}):`, err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 200 * attempt));
      } else {
        set({ isLoading: false });
      }
    }
  }
}
```

### 5.18. ☠️ `ConfirmModal` chaîné — `onDismiss` vide le state avant `action.onPress`

**Symptôme historique** : Sur tasks et calendar, le long-press ouvrait un 1er ConfirmModal "Que voulez-vous faire ?", puis "Supprimer" devait ouvrir un 2ème ConfirmModal de confirmation. Mais le tap sur "Supprimer" du 1er modal fermait les deux et ne déclenchait aucune suppression. L'user voyait le modal, cliquait, rien.

**Cause racine** : `ConfirmModal` (cf. `components/ConfirmModal.tsx`) appelle **synchroniquement** `onDismiss()` AVANT `setTimeout(0, action.onPress)` à chaque tap de bouton :

```tsx
onPress={() => {
  onDismiss();  // ← vide taskToDelete = null AVANT que action.onPress run
  setTimeout(() => action.onPress?.(), 0);
}}
```

Avec deux modals en chaîne où le 2ème dépend de `taskToDelete !== null`, le 1er `onDismiss` cassait la condition du 2ème → il ne s'ouvrait jamais.

**Solution appliquée** : **un seul ConfirmModal** par flow de suppression (le long-press est déjà un geste volontaire, une seule confirmation suffit). Plus de `confirmDelete` state. Un snapshot `idToDelete` est pris au début de `performDeleteTask` / `performDeleteEvent` pour défense en profondeur (au cas où le state aurait été vidé).

**🚨 NE JAMAIS** chaîner deux `ConfirmModal` dont le 2ème dépend d'un state que le 1er `onDismiss` modifie. Soit un seul modal, soit refactor `ConfirmModal` pour ne pas auto-dismiss.

### 5.19. 🟢 Pattern Realtime sync globale

Pour les listes qui doivent rester live entre devices (tâches, events plus tard) :
- Souscription unique au login dans `_layout.tsx` (pas dans chaque screen)
- 3 handlers : INSERT (append + dédup par id), UPDATE (map replace par id), DELETE (filter par id)
- Le store reste seul source de vérité, les composants ne souscrivent pas eux-mêmes
- Cleanup au logout pour pas garder un channel orphelin

**🚨 PRÉREQUIS Supabase** : la table doit être dans la publication `supabase_realtime` ET avoir `REPLICA IDENTITY FULL` (pour que la jsonb `comments`/`participants` soit envoyée complète sur UPDATE).

### 5.20. 🟢 Pattern sync différée des actions offline

Pour les actions micro-interactions (toggle status, comment, RSVP, réaction) :
- UI optimiste **toujours** appliquée localement (l'user voit son action)
- Si `getIsOnline() === false` → enqueue dans `pending-queue-store` au lieu de rollback
- Si online et l'API échoue mais on est passé offline pendant la requête → enqueue (même flux)
- Si vraie erreur (RLS, validation) → rollback + Toast (comportement v1.2 préservé)
- `queue-worker` drain au retour online (transition listener `onNetworkTransition`) + au démarrage app
- Idempotence par type d'action (refetch + check si déjà appliqué pour les comments/réactions)
- Re-fetch des listes UNIQUEMENT si la queue est entièrement vidée (sinon écraserait les optimistic states encore pending)

---

## 6. CURRENT STATE

### ✅ Terminé et testé sur device

| Catégorie | Items |
|---|---|
| **Sécurité** | Mode Preview supprimé, RLS Phase 1+2 strict, password change Supabase auth réel, leaked password sécurité activée (Free tier limité), JWT propagation fix |
| **UX cosmétique** | Chevron menu sidebar (au lieu de burger moche), version dynamique, émojis harmonisés, welcome card masquée par défaut, calendrier lundi-dimanche, bouton retour sur sous-pages, ParticipantsStack avec bottom sheet |
| **Flows core** | RSVP visible en haut event-detail + badge "À répondre" home, notifications cliquables (deep link event/task/category), checkbox inline tâches, recherche universelle La Bible, onboarding 3 écrans first launch |
| **Notifications** | Edge Function scheduled-reminders + pg_cron 15min, notifs locales backup (24h+1h tâches, 1h events), badge sur icône app, sync au login + invalide au logout |
| **Qualité images** | Compression avatars/screenshots/Bible, sanitize filenames, vrai aperçu image dans form |
| **Bug fixes critiques** | Race condition ajout groupe événement (1 seul ajouté → tous), file picker placeholder factice, drive link OK ne faisait rien, calendar badge incorrect, bug uuid `""`, expo-file-system deprecated, Storage InvalidKey, login fantôme |
| **Cleanup** | 6 fichiers morts supprimés (logs-store, messages-store, types/log, types/message, utils/logging, utils/i18n), liens canOpenURL fix Android 11+ |
| **UX polish (v1.2)** | Banner offline toast pill, haptic feedback partout, UI optimiste (toggle tâche, RSVP, mark read, delete), suppression long-press tâches+events, ConfirmModal custom, footer "Terminée par X · il y a Y", auto-assignation tâches, ParticipantsStack |
| **Search + filtres tâches (v1.3 / #7-#8)** | Search bar tâches (titre/description/catégorie/assignés, insensible casse). 5 chips combinables : Mes / Que j'ai créées / Catégorie (avec picker) / Priorité haute / En retard. Empty state distinct + bouton "Réinitialiser les filtres". Section "En retard" cachée pendant search ou filtre actif (anti-doublon) |
| **Realtime (v1.3 / #9)** | Lib `@supabase/realtime-js` ajoutée, RealtimeClient intégré dans le custom client. Migration `enable_realtime_on_tasks` (REPLICA IDENTITY FULL + publication). Sync globale tasks INSERT/UPDATE/DELETE → liste live entre devices. Commentaires temps réel via store-binding. Indicateur "X est en train d'écrire..." (broadcast channel). Réactions emoji 👍❤️🙏😂 (long-press → picker centré + pills toggleables, jsonb `reactions` sur les comments) |
| **Notif suppression à distance** | Si User A regarde une tâche et User B la supprime → Toast "Tâche supprimée par un autre utilisateur" + auto-close. `wasInStoreRef` pour éviter faux positifs au cold start |
| **Skeleton loading (v1.3 / #11)** | Composant `Skeleton` + variants TaskItem/CategoryRow/UserRow. Wired sur Tâches / La Bible / Annuaire au 1er chargement uniquement (cache vide). Pulsation opacity native driver |
| **Sync différée offline (v1.3 / #12)** | `pending-queue-store` (Zustand persist) + `queue-worker.ts`. Toggle tâche / addComment / réaction / RSVP enqueués si offline (optimistic préservé). Drain auto au retour online + au démarrage app. Idempotent par type, retry 5x avec abandon, Toast de succès. OfflineBanner affiche le compteur ("Hors ligne · 3 actions en attente") |
| **Bug fixes (v1.3)** | ConfirmModal chaîné qui empêchait delete de fonctionner (cf. 5.18) — fixé via merge en 1 modal sur tasks + calendar. Layout TaskDetail bottom (flex au lieu de height:'90%') |

### 🟡 Bugs résiduels connus (à investiguer)

1. **Toast offline error sur Android** : style natif moche quand offline + toggle tâche (cf. 5.12)
2. **Pas de tests automatisés** : aucun test unit/integration en place
3. **`types/task.ts` cassé** : ne contient pas le type Task (Metro accepte sans typecheck)
4. **Store `supabase-users-store.ts`** : doublon avec `users-store.ts` — à dédoublonner
5. **`app/admin/user-form.tsx` vs `app/admin/supabase-user-form.tsx`** : doublons potentiels — à investiguer (un audit avait identifié l'un comme obsolète mais les routes pointent vers l'un)

### ⏸️ En attente externe

- **DNS Resend** : `mysteriaevent.ch` chez Webland.ch — à check régulièrement, quand vert → rebrancher Edge Function `send-bug-email` côté `settings.tsx`

### 🛠️ Sauvegardes Git

| Tag | Date | Contenu |
|---|---|---|
| `v1.0-28.04.26` | 28 avril | Premier backup, UX overhaul + critical security fixes |
| `v1.1-29.04.26` | 29 avril | Sécurité Supabase Phase 1+2, cache fichiers Bible, JWT fix, tracking completion tasks |
| `v1.2-30.04.26` | 30 avril (dernière) | UX polish (offline banner, haptic, badge app, optimistic UI), suppression long-press, calendrier lundi |

---

## 7. NEXT STEPS

### 🔥 Priorité immédiate (prochaine session)

1. **🚨 Refonte onglet Notifications** (demande user 2026-05-02 — gros chantier) :
   - Tap sur notif : actuellement ne fait rien — doit ouvrir la cible (deep-link event/task/category) ET marquer comme lu auto. Le store a déjà `eventId`/`taskId` sur les notifs, à exploiter.
   - Lecture complète du message (peut-être tronqué actuellement via `numberOfLines`)
   - Delete : swipe-to-delete + long-press menu (cohérent avec tâches/events). Le store a déjà `deleteNotification`, juste l'UX à refaire.
   - Vue détail si pas de cible (notif info pure)
   - Polish : timestamp relatif ("il y a 2h"), regroupement par jour, distinction lue/non-lue plus marquée, skeleton au load
   - Audit à faire en début de session : `notifications.tsx` + `NotificationItem.tsx` + `notifications-store.ts`

2. **Test global de v1.3** : faire tester par Syndell + Luana + autres testeurs. Récolter feedback sur les nouveautés (search tâches, filtres, commentaires temps réel, typing indicator, réactions, sync offline, skeleton).

3. **Investiguer le toast offline Android** (toujours en attente, bug v1.2) : screenshot, voir le style cassé, corriger via config `react-native-toast-message`.

4. **Liste des 13 features — restantes** (10 déjà faites : 1-9, 11, 12) :
   - **#10 Quick Actions long-press icône** — iOS/Android quick actions (besoin EAS Build)
   - **#13 Widgets Home Screen** — iOS/Android widget natif (besoin EAS Build native)
   - Les deux nécessitent un EAS Build (sortie d'Expo Go) — peu prio si pas encore prêt à build prod.

### 📋 Roadmap moyen terme

1. **DNS Resend** : surveiller, rebrancher l'Edge Function dès propagation
2. **EAS Build** : faire un premier build de production (sortie d'Expo Go) pour :
   - Activer les push remote vraies (Expo Go bloque)
   - Activer Quick Actions / Widgets
   - Tester la perf sans le tunnel ngrok
3. **Compte démo** + **App Review Notes** (cf. recommandations audit Apple Store) pour soumission App Store / Play Store
4. **Cleanup dette tech** :
   - Réécrire `types/task.ts` avec le vrai type Task
   - Dédoublonner `users-store` vs `supabase-users-store`
   - Auditer `user-form` vs `supabase-user-form` admin
   - Migrer `expo-file-system/legacy` vers la nouvelle API File/Directory (non urgent)

### 🎯 Idées features futures (pas dans la liste 13, à valider)

- **Catégorie privée pour events** (visible seulement par membres listés) — partiellement implémentable via `restrictedAccess` mais pas exposé pour events
- **Mentions @user** dans commentaires
- **Récurrence** sur events (réunion mensuelle auto)
- **Pièces jointes aux tâches**
- **Calendar export .ics** (pour importer dans Google/Apple Calendar natif)
- **Dashboard stats admin** plus poussé

### ⚠️ NE PAS FAIRE

- Réintroduire un Mode Preview / fallback auto-loggué
- Faire un INSERT auto-create dans le flow login
- Appeler `reinitializeSupabase()` dans un retry path
- Utiliser `expo-file-system` (sans `/legacy`)
- Skip le sanitize filename / sanitize uuid avant upload/insert
- Skip le `selectionLimit: 1` sur expo-image-picker
- Mettre des policies RLS avec rôle `anon` (la porte d'entrée est `signInWithPassword`)
- Hardcoder des couleurs au lieu d'utiliser `theme.xxx`
- Mettre du haptic sur la navigation simple (anti-fatigue)
- Chaîner deux `ConfirmModal` dont le 2ème dépend d'un state que le 1er `onDismiss` modifie (cf. 5.18) — utiliser un seul modal
- Ajouter un INSERT/auto-create offline (la file d'attente v1.3 ne supporte que les UPDATE/toggle existants, pas les nouvelles entités — UUID locaux ↔ serveur trop complexe pour v1)

---

## 8. CONTACTS & RESSOURCES

- **GitHub** : [github.com/MortyStream/rork-myst-ria-intranet](https://github.com/MortyStream/rork-myst-ria-intranet)
- **Supabase Dashboard** : project `toefttzpdexugvfdqhfg` (eu-west-1)
- **Resend** : compte Kévin (en attente DNS)
- **EAS** : project `b2bdb0b9-18cf-40a6-be2c-c7dc1de3333c` (configuré dans app.json)
- **Owner Expo** : `mortystream`
- **Bundle IDs** : `ch.mysteriaevent.intranet` (iOS + Android)

### Membres clés équipe

- **Kévin Perret** (admin principal, dev référent)
- **Syndell Da Silva** (admin, testeuse iPhone — feedback UX précis)
- **Luana Roger** (admin, testeuse — propose features)
- **Salvatore Scuderi**, **Chloé Debons** (admins)

---

*Fin du document. Pour toute question existentielle, lire la section 5. Pour toute nouvelle feature, lire les sections 4 + 7.*
