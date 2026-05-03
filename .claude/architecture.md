# Architecture — Mystéria Event Intranet

> Stack technique, structure du projet, choix d'archi. À lire pour toute tâche qui touche à la structure, l'ajout de modules, ou les choix techniques.

---

## 1. Project Vision

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

**Public visé** : interne — MAIS l'app sera soumise à l'App Store. Le compte démo + Review Notes sont à préparer (cf. `.claude/roadmap.md`).

---

## 2. Tech Stack & Tools

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
| `expo-constants` | `~18.0.13` | Détection Expo Go vs prod build |
| `expo-updates` | `^55.0.21` | OTA updates (EAS Update à configurer) |

### Libs RN tierces

| Lib | Usage |
|---|---|
| `lucide-react-native` | Icônes — **toujours préférer Lucide à autres icon sets** |
| `react-native-toast-message` | Toasts (erreurs, succès) — branché dans `_layout.tsx` avec `toastConfig` custom dark/light |
| `react-native-safe-area-context` | Insets safe area (notch iPhone, status bar Android) |
| `react-native-gesture-handler` | Wrapping root pour gestures |
| `@react-native-community/netinfo` | Détection online/offline (utilisée par OfflineBanner) |
| `uuid` | Génération UUIDs v4 pour les IDs de comments / notifications |

### Backend

| Composant | Détails |
|---|---|
| **Supabase** | Project ID: `toefttzpdexugvfdqhfg` (region eu-west-1) |
| **Supabase Auth** | Email/password, JWT-based |
| **Postgres** | Tables : `users`, `tasks`, `events`, `notifications`, `resource_categories`, `resource_items`, `external_links`, `category_members`, `user_groups`, `user_group_members`, `directory_profiles`, `push_tokens`, `bug_reports` |
| **Storage buckets** | `avatars` (public), `bug-reports` (public), `resources` (public, fichiers Bible) |
| **Edge Functions** | Deno runtime, 2 fonctions : `send-bug-email`, `scheduled-reminders` |
| **pg_cron + pg_net** | Activés, utilisés pour planifier `scheduled-reminders` toutes les 15 min |
| **Resend** | Service email pour `send-bug-email` (en attente DNS `mysteriaevent.ch` côté Webland) |
| **Realtime** | Publication `supabase_realtime` activée sur `tasks` ET `notifications` (REPLICA IDENTITY FULL) — sync live des commentaires + listes + toast in-app |
| **RPC** | `toggle_comment_reaction(p_task_id, p_comment_id, p_emoji, p_user_id)` — toggle atomique avec SELECT FOR UPDATE pour éliminer race condition |

### Custom Supabase Client — **IMPORTANT**

L'app **n'utilise PAS le SDK officiel `@supabase/supabase-js`** mais un **client custom** dans `expo/utils/supabase.js` qui combine :
- `GoTrueClient` (de `@supabase/auth-js`) pour Auth
- `PostgrestClient` (de `@supabase/postgrest-js`) pour DB — avec **intercepteur 401 → refresh → retry** (mutex via promise partagée)
- `RealtimeClient` (de `@supabase/realtime-js`) pour les souscriptions WebSocket — partage le JWT avec Postgrest via `setAuth()` synchronisé dans `cacheAccessToken()`
- Implémentation maison de Storage (fetch direct vers `/storage/v1/object/...`)

**Pourquoi custom** : moins de bundle size + contrôle total des headers + cache JWT mémoire (cf. `hard-lessons.md` §5.2).

**🚨 Storage keys distinctes** :
- GoTrueClient session : `mysteria-auth-storage` (AsyncStorage)
- Zustand persist auth-store : `mysteria-auth-state` (AsyncStorage)

Avant la v3, les deux utilisaient `mysteria-auth-storage` → collision → écrasement de la session JWT par le persist Zustand → user éjecté vers /login à chaque cold start. Cf. `hard-lessons.md` §5.21.

### Commandes de dev

```powershell
# Démarrage serveur (depuis expo/)
cd C:\Users\MOOKI\mysteria-app\expo
npx expo start --tunnel --clear

# Install d'un package (toujours --legacy-peer-deps à cause du conflit React 19)
npm install <package> --legacy-peer-deps

# Reload sur device : secouer le téléphone → Reload
# Hard reload : Ctrl+C sur le serveur puis relancer avec --clear
```

### Sauvegarde Git

```powershell
# Repo : github.com/MortyStream/mysteria-app
# Branch : main
# Restoration : git checkout <commit-hash>
```

On bosse direct dans le origin repo `C:/Users/MOOKI/mysteria-app`. Les worktrees `.claude/worktrees/...` ne sont plus utilisés.

---

## 3. Architecture Globale

### Arborescence racine

```
mysteria-app/
├── CLAUDE.md                    ← Source de vérité racine, allégée (~2.5k tokens)
├── .claude/                     ← Doc modulaire + session data
│   ├── architecture.md          ← ce fichier
│   ├── conventions.md
│   ├── hard-lessons.md
│   ├── roadmap.md
│   └── archive/
├── .gitignore
├── expo/                        ← l'app principale
│   ├── app.json                 ← config Expo (bundle ID ch.mysteriaevent.intranet)
│   ├── package.json
│   ├── app/                     ← Routes Expo Router (file-based)
│   ├── components/              ← Composants réutilisables
│   ├── store/                   ← Zustand stores
│   ├── utils/                   ← Helpers (supabase, push, haptics, etc.)
│   ├── types/                   ← Types TS
│   ├── constants/               ← Colors, etc.
│   └── assets/                  ← Images statiques
├── supabase/                    ← Edge Functions Deno
│   └── functions/
│       ├── send-bug-email/
│       └── scheduled-reminders/
└── scripts/                     ← Auto-backup PowerShell (optionnel)
```

### Routing Expo Router (`expo/app/`)

```
app/
├── _layout.tsx                  ← Root : init auth, push tokens, OfflineBanner, sync local notifs, badge app, subscriber Realtime notifications + toast in-app, init users, init reminders signature stable
├── index.tsx                    ← Redirect : login/onboarding/home selon état auth
├── login.tsx                    ← Écran de login simplifié (plus de toggle "Mémoriser" / "Connexion rapide")
├── onboarding.tsx               ← 3 slides au premier launch après login
├── home.tsx                     ← Dashboard (greeting + grille accès rapides + tâches/events à venir)
├── tasks.tsx                    ← Mes tâches (search + 5 chips combinables + long-press delete)
├── notifications.tsx            ← Liste notifs (SectionList par jour + ConfirmModal delete + skeleton)
├── directory.tsx                ← Annuaire users avec search, gère le mode offline gracieusement
├── resources.tsx                ← La Bible main (search universelle + grille catégories)
├── links.tsx                    ← Liens externes
├── settings.tsx                 ← Réglages + signaler bug
├── bible.tsx                    ← Alias Redirect → /resources (pour bookmarks "/bible")
├── calendar/
│   ├── _layout.tsx
│   ├── index.tsx                ← Calendrier (cellules minHeight 44 + +N indicateur events)
│   ├── event-form.tsx           ← Création/édition event
│   └── event-detail.tsx         ← Détail event + RSVP
├── profile/
│   ├── index.tsx                ← Mon profil (loader si user pas hydraté, plus de "non connecté")
│   ├── edit.tsx                 ← Édition profil + upload avatar
│   └── change-password.tsx      ← Changement mdp (vraie Supabase auth)
├── resources/
│   └── [id].tsx                 ← Détail catégorie Bible avec items + cache files
├── user/
│   └── [id].tsx                 ← Profil d'un autre user
└── admin/                       ← Panneau admin (réservé admin/responsable_pole)
    ├── index.tsx                ← Attend hydratation user avant garde de droits
    ├── user-form.tsx            ← Création/édition users (le seul, supabase-user-form supprimé)
    ├── users.tsx
    ├── categories.tsx
    ├── category-form.tsx
    ├── groups.tsx
    ├── group-form.tsx
    ├── link-form.tsx
    ├── links.tsx
    ├── notifications.tsx        ← (doublon avec notification-form, à dédoublonner — dette tech)
    ├── notification-form.tsx
    ├── permissions.tsx
    ├── resource-item-form.tsx   ← Création/édition item Bible (file/image/link/text/folder)
    ├── stats.tsx
    ├── tasks.tsx
    ├── appearance.tsx
    ├── database.tsx             ← (legacy panel, consomme supabase-users-store legacy)
    └── database-config.tsx
```

### Composants clés (`expo/components/`)

| Composant | Rôle |
|---|---|
| `Header.tsx` | Header avec back button + title + chevron sidebar + rightComponent. Used partout. |
| `AppLayout.tsx` | Wrapper avec Sidebar slide-in. Sur les **pages principales** (home, tasks, calendar, etc.) — pas sur les sous-pages. Close sidebar sur changement de pathname sans cascade re-fire. |
| `SideBar.tsx` | Menu lateral coulissant |
| `SplashScreen.tsx` | Écran de chargement initial |
| `Calendar.tsx` | Composant calendrier mensuel custom (semaine **lundi-dimanche**) — minHeight 44 + indicateur "+N" si jour avec >3 events |
| `TaskItem.tsx` | Card de tâche avec checkbox round + checkbox pour marquer fait. **`React.memo`** pour perf Realtime. |
| `TaskDetail.tsx` | Modal de détail d'une tâche avec commentaires + KeyboardAvoidingView. Avatars assignés tappables → profil. Toast au lieu d'Alert pour actions. |
| `TaskForm.tsx` | Form création/édition tâche (utilise ParticipantsStack). Validations → Toast custom (plus d'Alert). |
| `OfflineBanner.tsx` | Toast pill compact en bas + hooks/exports `useIsOnline()`, `getIsOnline()` (sync), `onNetworkTransition(cb)`. Compteur d'actions en attente. **Adapté dark mode** (sombre + bordure jaune). |
| `ConfirmModal.tsx` | Dialog custom pour confirmations (remplace Alert.alert moche). ⚠️ **NE PAS chaîner deux instances** : `onDismiss` est appelé synchroniquement avant `action.onPress` (cf. `hard-lessons.md` §5.18) |
| `ParticipantsStack.tsx` | Stack d'avatars chevauchants + bottom sheet (au lieu de longue liste de chips) |
| `Skeleton.tsx` | Rectangle + **shimmer wave gradient** + variants (`TaskItemSkeleton`, `CategoryRowSkeleton`, `UserRowSkeleton`, `NotificationItemSkeleton`) pour 1er chargement |
| `NotificationItem.tsx` | Card notif refonte UX : border-left coloré + bg teinté + bold pour non-lues, accent par type (task/event/category), chevron si actionable, badge "Tâche terminée"/"Événement passé" si obsolète. **`React.memo`** pour perf. |
| `InAppNotificationToast.tsx` | Toast in-app style WhatsApp : slide-down du haut quand notif Realtime arrive, swipe-up dismiss, auto 4.5s, tap → deep-link |
| `ToastConfig.tsx` | Config custom de `react-native-toast-message` : success/error/info adaptés dark/light avec border-left coloré, icon bubble, ombre |
| `Avatar.tsx` | Avatar circulaire avec initiales fallback |
| `Card.tsx` | Card de base avec ombre |
| `Button.tsx` | Bouton multi-variants (primary, outline, text) |
| `Input.tsx` | TextInput stylé |
| `Badge.tsx` | Badge coloré (rôles users) |
| `EmptyState.tsx` | État vide avec icône + message + action |
| `ListItem.tsx` | Row de liste (settings, etc.) |
| `Divider.tsx` | Trait de séparation |
| `UserListItem.tsx` | Row d'user pour annuaire. **`React.memo`**. |
| `ResourceItemList.tsx` | Liste d'items dans une catégorie Bible |

### Stores Zustand (`expo/store/`)

| Store | Persisté ? | État principal |
|---|---|---|
| `auth-store.ts` | ✅ (storageKey `mysteria-auth-state` v3 — distinct du GoTrueClient `mysteria-auth-storage`) | `user`, `isAuthenticated`, `storedCredentials` (legacy, plus écrit) |
| `tasks-store.ts` | ✅ (`tasks-storage-v2`) | `tasks`, `remindersSent` |
| `calendar-store.ts` | ✅ (`calendar-storage-v2`) | `events` |
| `notifications-store.ts` | ✅ (`mysteria-notifications-storage`) | `notifications`, `isMessagingEnabled`. addNotification utilise `uuid v4` (cf. `hard-lessons.md` §5.22). markAllAsRead avec rollback ciblé. |
| `resources-store.ts` | ✅ | `categories`, `resourceItems`, `externalLinks` |
| `users-store.ts` | ✅ | `users` (annuaire complet). initializeUsers : si offline + cache → skip silencieux (pas d'erreur réseau alarmante) |
| `settings-store.ts` | ✅ | `darkMode`, `persistLogin`, `welcomeMessage`, `hasSeenOnboarding`, etc. |
| `user-groups-store.ts` | ✅ (`user-groups-storage-v1`) | `groups` (liste groupes Comité, RH, etc.) |
| `supabase-roles-store.ts` | ✅ | (legacy, peu utilisé — uniquement par `admin/database.tsx`) |
| `supabase-users-store.ts` | ✅ | (legacy/dupliqué avec users-store — dette tech, uniquement consommé par `admin/database.tsx`) |
| `pending-queue-store.ts` | ✅ (`mysteria-pending-queue-v1`) | `actions: PendingAction[]` — file FIFO des actions offline à rejouer (toggle tâche, comment, réaction, RSVP) |
| `in-app-toast-store.ts` | ❌ (state UI éphémère) | `current: Notification \| null` — alimenté par subscriber Realtime, lu par `<InAppNotificationToast>` |

**Note sur `tasks-store.ts`** : exporte aussi `startTasksRealtimeSync()` / `stopTasksRealtimeSync()` (module-level, pas dans le store). Branchés au login/logout dans `_layout.tsx`.

### Utils (`expo/utils/`)

| Fichier | Exports |
|---|---|
| `supabase.js` | `getSupabase()`, `cacheAccessToken()`, `getCachedAccessToken()`, `syncUserWithSupabase()`, `subscribeToTasksList({onInsert, onUpdate, onDelete})`, `subscribeToTask(taskId, onUpdate)`, `subscribeToTaskTyping(taskId, {onTyping})`, **`subscribeToNotifications(onInsert)`** (pour toast in-app), `reinitializeSupabase()` (⚠️ NE PAS UTILISER — cf. `hard-lessons.md` §5.3). Custom fetch wrapper avec **intercepteur 401 → refresh → retry** (mutex). |
| `push-notifications.ts` | `registerPushToken(userId)`, `unregisterPushToken(userId)`, `sendPushNotifications(userIds, title, body, data)` |
| `local-notifications.ts` | `syncLocalReminders(tasks, events, userId)`, `clearAllLocalReminders()`, `setAppBadge(count)`, `clearAppBadge()` |
| `file-cache.ts` | `getCachedOrDownload(itemId, remoteUrl)`, `isFileCached(itemId, remoteUrl)`, `clearCache()`, `formatBytes()` |
| `image-compression.ts` | `compressImage(uri, options)`, `sanitizeFilename(name)` |
| `haptics.ts` | `tapHaptic()`, `mediumHaptic()`, `successHaptic()`, `warningHaptic()`, `errorHaptic()`, `selectionHaptic()` — **import statique** partout (plus de `await import` dynamique) |
| `date-utils.ts` | `formatDate`, `formatRelativeDate` |
| `queue-worker.ts` | `flushPendingQueue()`, `triggerFlush()` — drain la file `pending-queue-store` quand online. Idempotent par type d'action. Pour les réactions, utilise la RPC atomique. |

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
        │   - Authorization: Bearer <_cachedAccessToken || anon_key>
        │   - apikey: anon_key
        │   - Si 401 → refresh session → retry (1x, mutex partagé)
        │
   Supabase REST/Storage/RPC
        │
   RLS (private.is_admin() etc.)
        │
   Postgres
```

**Au login** :
- `signInWithPassword()` → Supabase
- `cacheAccessToken(session.access_token)` synchrone immédiat
- `setSession()` propagé au GoTrueClient
- Subscribers Realtime (tasks + notifications) démarrés via `_layout.tsx`
- `initializeUsers()` dans `_layout.tsx` (sinon TaskForm assigné picker vide)
- `syncLocalReminders()` programmé via signature stable

**Au logout** :
- `unregisterPushToken()` await (pour que le DELETE parte avec le bon JWT)
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

#### `scheduled-reminders/index.ts` (v3 déployée 2026-05-03)
- Tourne **toutes les 15 min via pg_cron**
- Vérifie tâches avec deadline dans 24h ± 20min ET 1h ± 20min
- Vérifie events avec startTime dans 1h ± 20min
- Pour chaque match : envoie push via Expo Push API + crée notification in-app
- **Déduplique via colonnes** : `tasks.reminder24hSentAt`, `tasks.reminder1hSentAt`, `events.reminder1hSentAt`
- Utilise `crypto.randomUUID()` pour les IDs notifications (Deno natif — fix v3 du bug UUID, cf. `hard-lessons.md` §5.22)
- Utilise `SUPABASE_SERVICE_ROLE_KEY` (env var Supabase)
- Titres courts : `📅 Deadline dans 24h` / `🚨 Plus qu'1h !` / `⏰ Événement dans 1h` (≤ 22 chars pour tenir sur 1 ligne dans la card UI)
