# Conventions de Code & Patterns

> Règles à suivre pour rester cohérent. À lire pour toute écriture de nouveau code (composant, store, écran). Les patterns positifs ✅ sont à reproduire, les warnings ☠️ sont dans `hard-lessons.md`.

---

## 1. Naming

| Type | Convention | Exemples |
|---|---|---|
| **Colonnes DB** | `camelCase` (PAS snake_case) | `supabaseUserId`, `createdAt`, `updatedAt`, `assignedTo`, `targetUserIds`, `taskId` |
| **Variables JS** | `camelCase` | `currentUser`, `isLoading` |
| **Composants React** | `PascalCase` | `TaskItem`, `OfflineBanner` |
| **Fichiers de composants** | `PascalCase.tsx` | `TaskItem.tsx` |
| **Fichiers utils** | `kebab-case.ts` | `local-notifications.ts`, `image-compression.ts` |
| **Stores** | `xxx-store.ts` | `tasks-store.ts`, `auth-store.ts` |
| **Fonctions SQL helpers** | `snake_case`, dans schéma `private` | `private.is_admin()`, `private.current_user_internal_id()` |

⚠️ **camelCase DB** est non-évident — Postgres/Supabase autorise les deux mais on a tout en camelCase. Faut toujours quoter dans le SQL : `"createdAt"`, `"taskId"`.

---

## 2. TypeScript

- **Strict typing pas obligatoire** (Metro ne fait pas de typecheck strict)
- `as any` toléré pour résoudre vite, **mais à éviter** dans les nouvelles features
- `@/` alias pointe vers `expo/` (configuré dans tsconfig)
- Types dans `expo/types/` — `task.ts` reconstruit en V2 (avant : corrompu, contenait une vieille copie d'écran)

---

## 3. State management

- **Zustand persist sur tous les stores** avec `partialize` pour ne pas serialize des fonctions
- **Initialize avec retry x3 backoff** sur tous les fetch initiaux (cf. pattern §6.2)
- **Optimistic UI obligatoire** sur les actions fréquentes (toggle tâche, RSVP, mark read) — pattern §6.1
- **Snapshot + rollback** sur erreur API + Toast d'erreur
- **Idempotence client** sur les actions toggleables (markAsRead) : check si déjà fait avant d'appeler l'API
- ⚠️ **Ne JAMAIS appeler `reinitializeSupabase()`** dans un retry (cf. `hard-lessons.md` §5.3)

---

## 4. UI/UX

- **Pas d'`Alert.alert` pour les confirmations destructives** → utiliser `<ConfirmModal>` (cf. `expo/components/`)
- **Pas d'`Alert.alert` pour les feedback de succès / erreurs validation** → utiliser `Toast.show({ type: 'success'|'error' })` (toastConfig custom dark/light)
- **Long-press 500ms** sur les items pour les actions secondaires (delete tâche, delete event, menu options notif)
- **Haptic feedback obligatoire** sur les actions confirmées :
  - `tapHaptic()` pour toggle / send commentaire
  - `successHaptic()` pour save / login / RSVP accepter
  - `warningHaptic()` pour suppression confirmée
  - `mediumHaptic()` pour ouverture menu long-press
- **Pas de haptic** sur navigation simple ou tap d'item (anti-fatigue tactile)
- **Import statique** de `@/utils/haptics` (pas `await import(...)` dynamique — gain inutile sur 1KB)
- **Toast `react-native-toast-message`** pour les feedback non bloquants — branché dans `_layout.tsx` avec `toastConfig` custom (cf. `expo/components/ToastConfig.tsx`)
- **Couleurs via `theme`** (pas de hardcoded `#xxxxxx`) sauf dans buckets séparés (warning jaune, etc.)
- **Border radius standard** : `8` (input), `12` (small card), `14-16` (notif card), `16-18` (modal), `24` (pill toast)
- **Touch targets ≥ 44pt** (HIG iOS) — padding 10 minimum sur les boutons icône 24px

---

## 5. Storage / Files

- **Toujours sanitize les filenames** avant upload Supabase Storage (`sanitizeFilename()`) — sinon "InvalidKey 400"
- **Compresser les images** avant upload (`compressImage(uri, {maxWidth: 1024, quality: 0.7})`)
- **Cache local** pour les fichiers Bible via `getCachedOrDownload()`
- **`expo-file-system/legacy`** pas `expo-file-system` (deprecated en SDK 54)
- **`expo-image-picker`** : toujours `mediaTypes: ['images']` (nouveau format SDK 54), `selectionLimit: 1`, `allowsMultipleSelection: false`, `exif: false`, `base64: false`

---

## 6. Patterns positifs ✅

### 6.1 Optimistic UI

**Toujours** ce pattern pour les actions fréquentes :

```typescript
const previousState = get().items;
set({ items: optimisticUpdate(previousState) });

try {
  const { data, error } = await supabase.from('table').update(...).eq('id', id).select().single();
  if (error) throw error;
  set({ items: state.items.map(i => i.id === id ? data : i) }); // reconcile
} catch (err) {
  set({ items: previousState }); // rollback
  Toast.show({ type: 'error', text1: 'Erreur', text2: '...' });
  throw err;
}
```

**Variante avec rollback ciblé** (préférable quand plusieurs items touchés) : ne snapshot que les IDs réellement modifiés, rollback uniquement ceux-là (évite d'écraser les changements d'autres devices via Realtime entre l'optimistic et la réponse).

### 6.2 Initialize* avec retry backoff

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

**Variante offline-aware** : si `getIsOnline() === false` et qu'on a un cache local, skip silencieusement (pas d'erreur réseau alarmante affichée). C'est ce que fait `users-store.initializeUsers()`.

**🚨 IMPORTANT** : si la DB retourne 0 rows, **toujours réécrire le store avec `[]`**, ne pas garder le cache local. Sinon les rows supprimées en DB persistent indéfiniment en local (bug historique de notifications-store).

### 6.3 Realtime sync globale

Pour les listes qui doivent rester live entre devices (tasks, notifications) :
- Souscription unique au login dans `_layout.tsx` (pas dans chaque screen)
- 3 handlers : INSERT (append + dédup par id), UPDATE (map replace par id), DELETE (filter par id)
- Le store reste seul source de vérité, les composants ne souscrivent pas eux-mêmes
- Cleanup au logout pour pas garder un channel orphelin

**🚨 PRÉREQUIS Supabase** : la table doit être dans la publication `supabase_realtime` ET avoir `REPLICA IDENTITY FULL` (pour que la jsonb `comments`/`participants` soit envoyée complète sur UPDATE).

**Pour les notifs** : le subscriber `_layout.tsx` filtre par user (cohérent avec `getUserNotifications()`) puis :
1. Push dans `useNotificationsStore` (avec dédup par id) pour que l'onglet se mette à jour live
2. Appelle `useInAppToastStore.show(notif)` pour afficher le toast in-app slide-down

### 6.4 Sync différée des actions offline

Pour les actions micro-interactions (toggle status, comment, RSVP, réaction) :
- UI optimiste **toujours** appliquée localement (l'user voit son action)
- Si `getIsOnline() === false` → enqueue dans `pending-queue-store` au lieu de rollback
- Si online et l'API échoue mais on est passé offline pendant la requête → enqueue (même flux)
- Si vraie erreur (RLS, validation) → rollback + Toast (comportement standard préservé)
- `queue-worker` drain au retour online (transition listener `onNetworkTransition`) + au démarrage app
- Idempotence par type d'action (refetch + check si déjà appliqué pour les comments)
- **Pour les réactions** : toujours via la RPC atomique `toggle_comment_reaction` (jamais d'UPDATE direct du jsonb — race condition garantie)
- Re-fetch des listes UNIQUEMENT si la queue est entièrement vidée (sinon écraserait les optimistic states encore pending)

### 6.5 useEffect avec async — flag cancelled

Pour tout `useEffect` qui fait un `await import(...)` ou un fetch async dont le résultat assigne quelque chose :

```typescript
useEffect(() => {
  let cancelled = false;
  someAsyncOp().then((result) => {
    if (cancelled) return;
    // assigner result
  });
  return () => { cancelled = true; };
}, [deps]);
```

Sinon, si le useEffect cleanup arrive avant que la promise résolve, l'assignment se fait quand même → memory leak ou double events (cf. listeners expo-notifications).

### 6.6 useEffect deps stables (signature)

Si une dep change trop souvent (ex : `tasks` array qui mute à chaque update Realtime), créer une **signature stable** via `useMemo` qui ne change que sur les champs pertinents :

```typescript
const tasksReminderKey = useMemo(
  () => tasks.map(t => `${t.id}|${t.deadline}|${t.status}|${t.assignedTo.join(',')}`).join(';'),
  [tasks]
);

useEffect(() => {
  syncLocalReminders(tasks, ...);
}, [tasksReminderKey]); // ne re-fire que sur changement de deadline/status/assignedTo
```

Sinon, le `setTimeout` de debounce est perpétuellement re-cleanup → fonction jamais exécutée en cas d'activité soutenue.

---

## 7. RLS / Security

- **Tous les helpers sécurité dans schéma `private`** (non exposé via PostgREST) — `private.is_admin()`, `private.current_user_internal_id()`, `private.current_user_role()`
- **JAMAIS de policy avec rôle `anon`** (la porte d'entrée est `signInWithPassword`)
- **JAMAIS de fallback "user fantôme" / "preview admin"** (faille critique — cf. `hard-lessons.md` §5.1)
- **WITH CHECK strict** : `supabaseUserId = auth.uid()` ou `private.is_admin()`
- **Policy "first link"** : seule exception, permet UPDATE sur `users` si `supabaseUserId IS NULL` ET `email = auth.jwt() ->> 'email'`. Côté client, toujours filtrer aussi `.is('supabaseUserId', null)` pour éviter erreur RLS confuse si la row est déjà liée.
- **Pour les opérations atomiques** (toggle réaction sur jsonb), utiliser une RPC Postgres avec `SELECT FOR UPDATE` plutôt qu'un UPDATE direct (race condition).

---

## 8. Async patterns

- **`async/await`** plutôt que `.then()` (lisibilité)
- **`try/catch` obligatoire** sur tous les calls Supabase / réseau
- **Helper `getErrorMessage(err: unknown)`** pour extraire un message lisible (instanceof Error / string / object) — évite crash sur `error.message` quand `error` est unknown
- **Best-effort non bloquant** pour les opérations secondaires : `console.log` au lieu de `console.error`, ne pas re-throw
- **Re-throw** uniquement pour les opérations critiques (login, save user-facing)
- **`await unregisterPushToken()` dans logout** — sinon la requête DELETE peut partir après `signOut` qui clear le token → token reste en DB

---

## 9. UUID & jsonb

- **Toujours `uuid v4`** pour générer un `id` côté client (utiliser `import { v4 as uuidv4 } from 'uuid';` côté front, `crypto.randomUUID()` côté Edge Deno)
- **JAMAIS** de string custom type `notification-${Date.now()}-${Math.random()}` pour des colonnes `uuid` Postgres (INSERT échoue silencieusement avec `invalid input syntax for type uuid` — bug historique majeur, cf. `hard-lessons.md` §5.22)
- **Sanitize les UUIDs nullables** : si `parentId` peut être `""` (string vide), convertir en `null` avant INSERT/UPDATE — Postgres rejette `""` pour les colonnes uuid

---

## 10. Comments

- **JSDoc** pour les fonctions exportées (utils, stores)
- **Commentaires en français** pour la logique métier (l'app est française, l'équipe aussi)
- **Préfixes descriptifs** dans les `console.log` : `[Push]`, `[LocalNotif]`, `[Badge]`, `[OfflineBanner]`, `[Realtime]`, `[Queue]`
- **`console.log` strippé en prod** via `babel-plugin-transform-remove-console` (preserves `error` et `warn`)
- Si tu fixes un bug subtil, **note la cause racine** dans le code (commentaire) ou ajoute une Hard Lesson à `hard-lessons.md`. Sinon le suivant le re-introduira.
