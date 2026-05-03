# Hard Lessons — Bugs résolus, pièges à éviter

> **Section vitale.** Lire avant toute modification touchant l'auth, RLS, Supabase, le storage, les notifications, ou les stores. Chaque entrée = un bug qu'on a déjà payé une fois. Réintroduire = casser la prod.
>
> Légende : ☠️ = critique (sécurité ou data loss) · 🟠 = bug bloquant · 🟢 = pattern positif (déplacés vers `conventions.md`)

---

## 5.1. ☠️ Mode Preview = Faille critique RÉSOLUE

**Symptôme historique** : N'importe qui pouvait taper email/mdp aléatoires et entrer en mode "Mode Preview" avec **rôle admin et toutes permissions**.

**Cause racine** : L'état initial Zustand contenait `user: PREVIEW_USER (role: admin), isAuthenticated: true`. Si le login échouait, ce state preview persistait → l'app considérait l'utilisateur authentifié.

**Solution appliquée** :
1. État initial du store auth = `user: null, isAuthenticated: false`
2. Suppression complète de `PREVIEW_USER`, `DEFAULT_ADMIN`, `DEFAULT_MODERATOR`, `createPreviewUser()`, `enablePreviewMode()`
3. Migration `persist` v2 : invalide tout state résiduel avec `user.id === 'preview-user'`
4. `clearAuthState()` (helper) appelé en cas d'échec d'init au lieu d'`enablePreviewMode()`

**🚨 NE JAMAIS** réintroduire un fallback "auto-loggué", même temporaire, même en dev.

---

## 5.2. ☠️ JWT propagation post-`signInWithPassword`

**Symptôme historique** : Login OK, mais ensuite "user fantôme" (Membre sans nom) ou TOUTES les pages vides (annuaire, tâches, calendrier).

**Cause racine** : `getSession()` du custom GoTrueClient peut retourner `null` immédiatement après `signInWithPassword` à cause d'un délai async d'écriture AsyncStorage. Pendant cette fenêtre (50-200ms surtout sur Android), le custom Postgrest fetch wrapper utilise la `SUPABASE_ANON_KEY` au lieu du JWT user → toutes les requêtes partent en mode anon → RLS bloque → 0 résultat retourné silencieusement.

**Solution appliquée** :
1. **Cache mémoire JS** dans `utils/supabase.js` : `let _cachedAccessToken = null`
2. **`cacheAccessToken(token)`** exporté, appelé **synchroniquement** après `signInWithPassword` dans `auth-store.ts`
3. Le fetch wrapper lit en priorité `_cachedAccessToken`, fallback `getSession()` ensuite
4. `setSession()` toujours appelé en parallèle pour mettre à jour le state interne du GoTrueClient
5. Au logout : `cacheAccessToken(null)` pour pas qu'un autre user récupère l'ancien token
6. Au cold start (`initializeAuth`) : appel immédiat à `cacheAccessToken(data.session.access_token)` dès que `getSession()` retourne — sinon les requêtes suivantes (`linkUser`, `syncUser`, fetch profile) partent en anon avant que le cache soit set.

**🚨 NE JAMAIS** retirer le `cacheAccessToken` sans avoir une vraie alternative testée.

---

## 5.3. ☠️ `reinitializeSupabase()` est destructif

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

**🚨 NE JAMAIS** appeler `reinitializeSupabase()` ailleurs que dans le menu admin de config Supabase. Réservé aux cas extrêmes.

---

## 5.4. ☠️ 3 sources d'INSERT sur `users` qui créaient des fantômes

**Symptôme historique** : Erreurs RLS 42501 lors du login + user fantôme.

**Cause racine** : 3 endroits différents tentaient de créer un nouvel user en DB :
1. `linkUserProfileWithSupabaseAuth` (fallback "no profile found")
2. `syncUserWithSupabase` upsert qui pouvait INSERT
3. `login()` (fallback "no profile found at all")

**Quand le JWT n'était pas propagé** (cf. §5.2), ces INSERT échouaient car la WITH CHECK RLS exigeait `supabaseUserId = auth.uid()` mais `auth.uid()` était NULL.

**Solution appliquée** :
- **Aucun INSERT sur `users` dans le flow login**. Les profils sont créés EXCLUSIVEMENT par les admins via `/admin/user-form`.
- `linkUserProfileWithSupabaseAuth` est devenu **best-effort** : cherche par supabaseUserId puis par email (case-insensitive `ilike`), update si trouvé sans supabaseUserId, sinon retourne false silencieusement
- **UPDATE filtré** côté client : `.is('supabaseUserId', null)` pour éviter erreur RLS confuse si la row est déjà liée à un autre auth user
- `syncUserWithSupabase` cherche d'abord la row, update juste `updatedAt` si trouvée, return en non-bloquant sinon
- Le fallback dans `login()` est supprimé

**🚨 NE JAMAIS** réintroduire un INSERT auto-create dans le flow login. Sécurité ET cohérence des données.

---

## 5.5. ☠️ `Alert.alert` est moche sur Android (et bloquant)

**Symptôme** : Popup blanc carré système Android, pas du tout aligné sur le thème dark de l'app. iOS est moins moche mais reste bloquant et hors-thème.

**Solution** :
- Pour les **confirmations destructives** : composant `<ConfirmModal>` custom (`expo/components/ConfirmModal.tsx`)
  - Modal transparent + backdrop semi-transparent (`rgba(0,0,0,0.55)`)
  - Card centrée arrondie 18px max-width 360px
  - Boutons stylés : `cancel` (gris), `primary` (couleur app), `destructive` (rouge `theme.error`)
  - Tap-outside-to-close, animation fade
- Pour les **succès / erreurs validation** : `Toast.show({ type: 'success'|'error' })` via le `toastConfig` custom (`expo/components/ToastConfig.tsx`)
  - Adapté dark/light, border-left coloré, icon bubble, ombre

**🚨 PLUS d'Alert.alert** dans le code applicatif (sauf cas legacy non encore migrés à signaler en TODO).

---

## 5.6. ☠️ iOS PHPicker bloqué (image picker)

**Symptôme historique** : Sur iOS, le picker d'image affichait un checkmark sur la photo mais aucun bouton "Add" → user bloqué dans le PHPicker, impossible de fermer.

**Cause racine** : Sans `selectionLimit: 1` explicite + `allowsMultipleSelection: false`, iOS basculait en mode multi-select avec UI inadéquate.

**Solution appliquée** : **TOUJOURS** ces options pour `expo-image-picker` :
```typescript
{
  mediaTypes: ['images'],          // SDK 54 nouvelle API (avant : MediaTypeOptions.Images, deprecated)
  allowsMultipleSelection: false,
  selectionLimit: 1,
  allowsEditing: false,            // sinon iOS demande crop confirm = lourd
  exif: false,                     // évite memory issues sur grosses photos
  base64: false,
}
```

---

## 5.7. ☠️ Supabase Storage InvalidKey

**Symptôme historique** : Upload de fichier "26.04.15_PV Réunion Mystéria signé.pdf" → erreur 400 "Invalid key".

**Cause racine** : Supabase Storage rejette les keys avec **espaces, accents, caractères spéciaux**.

**Solution appliquée** : Fonction `sanitizeFilename()` dans `utils/image-compression.ts` :
- Normalize NFD + retire les diacritiques
- Remplace tout caractère non `[A-Za-z0-9._-]` par `_`
- Préserve l'extension
- Limite à 100 chars

**🚨 TOUJOURS** appeler `sanitizeFilename()` sur le filename utilisateur avant upload.

---

## 5.8. ☠️ UUID empty string `""` en Postgres

**Symptôme historique** : Création d'un item Bible → erreur Postgres 22P02 "invalid input syntax for type uuid: ''".

**Cause racine** : Quand `parentId` est `undefined`/`null`, expo-router `params` peut le passer comme string `""`. Les colonnes UUID Postgres rejettent les strings vides.

**Solution appliquée** :
1. **Côté form** : `const parentId = rawParentId && rawParentId !== '' ? rawParentId : null`
2. **Côté store** : `sanitizeUuid()` helper dans `addResourceItem` qui convertit `""` → `null`

**🚨 TOUJOURS** sanitize les UUIDs nullables avant un INSERT/UPDATE Supabase.

---

## 5.9. ☠️ `expo-file-system` API déprécié SDK 54

**Symptôme historique** : Erreur `Method getInfoAsync imported from "expo-file-system" is deprecated`.

**Solution** : `import * as FileSystem from 'expo-file-system/legacy'` (avec `/legacy`).

La nouvelle API File/Directory est plus performante mais demande un refactor non prioritaire.

---

## 5.10. 🟠 Calendrier US par défaut

**Solution** : `weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']` + `getFirstDayOfMonth()` retourne 0=Lun ... 6=Dim au lieu du défaut JS (0=Dim).

---

## 5.11. 🟠 Expo Go SDK 53+ ne supporte pas les push remote

**Limitation connue** : `expo-notifications` (mode remote push) ne fonctionne PAS dans Expo Go depuis SDK 53. Les **local notifications** marchent.

**Workaround actuel** : Notifications locales programmées sur le device (`syncLocalReminders()`). Pour les push remote en prod : **EAS Build requis**.

**🚨 NE PAS prétendre que les push remote marchent en testant via Expo Go.**

---

## 5.13. 🟠 Bottom-sheet pas natif

`ParticipantsStack.tsx` utilise un `Modal` simple comme bottom sheet. Pour un vrai bottom sheet drag/swipe, on pourrait utiliser `@gorhom/bottom-sheet` mais c'est un gros refactor — pas prioritaire.

---

## 5.14. 🟠 Edge Function `send-bug-email` en attente DNS

DNS Resend pour `mysteriaevent.ch` chez **Webland.ch** pas encore propagé. En attendant, l'app utilise `MailComposer` côté client. À rebrancher quand le statut Resend passe au vert.

---

## 5.15. 🟠 Push tokens registration silencieux

`registerPushToken(userId)` peut échouer silencieusement si :
- L'user a refusé la permission notifications iOS
- L'app tourne sur Expo Go SDK 53+
- AsyncStorage défaillant

Le login ne bloque pas dessus. Conséquence : les push remote ne partent pas pour cet user. **Acceptable** tant qu'on est en Expo Go.

**Côté logout** : on `await unregisterPushToken(userId)` pour que le DELETE parte avec le bon JWT (sinon `signOut` clear le token avant et la requête échoue).

---

## 5.18. ☠️ `ConfirmModal` chaîné — `onDismiss` vide le state avant `action.onPress`

**Symptôme historique** : Sur tasks et calendar, le long-press ouvrait un 1er ConfirmModal "Que voulez-vous faire ?", puis "Supprimer" devait ouvrir un 2ème ConfirmModal de confirmation. Mais le tap sur "Supprimer" du 1er modal fermait les deux et ne déclenchait aucune suppression.

**Cause racine** : `ConfirmModal` (cf. `components/ConfirmModal.tsx`) appelle **synchroniquement** `onDismiss()` AVANT `setTimeout(0, action.onPress)` à chaque tap de bouton :

```tsx
onPress={() => {
  onDismiss();  // ← vide taskToDelete = null AVANT que action.onPress run
  setTimeout(() => action.onPress?.(), 0);
}}
```

Avec deux modals en chaîne où le 2ème dépend de `taskToDelete !== null`, le 1er `onDismiss` cassait la condition du 2ème → il ne s'ouvrait jamais.

**Solution appliquée** : **un seul ConfirmModal** par flow de suppression (le long-press est déjà un geste volontaire, une seule confirmation suffit). Snapshot `idToDelete` pris au début de `performDeleteTask` / `performDeleteEvent` pour défense en profondeur.

**🚨 NE JAMAIS** chaîner deux `ConfirmModal` dont le 2ème dépend d'un state que le 1er `onDismiss` modifie. Soit un seul modal, soit refactor `ConfirmModal` pour ne pas auto-dismiss.

---

## 5.21. ☠️ Collision storageKey GoTrueClient + Zustand persist auth-store

**Symptôme historique** : Auto-login impossible. À chaque cold start de l'app, l'user atterrissait sur `/login` malgré une session précédente. Il devait cliquer "Connexion rapide" pour se re-co.

**Cause racine** : Les deux utilisaient la **même clé AsyncStorage** :
- GoTrueClient : `storageKey: 'mysteria-auth-storage'` (cf. `utils/supabase.js`)
- Zustand persist auth-store : `name: 'mysteria-auth-storage'` (cf. `auth-store.ts`)

À chaque update du store auth (`set({ user, isAuthenticated })`), Zustand persist écrasait la **session JWT** de GoTrueClient stockée par Supabase. Au cold start, `getSession()` lisait du JSON Zustand (avec juste `user`/`isAuthenticated`, pas de `access_token`/`refresh_token`) → parse fail → null → `clearAuthState` → redirect `/login`.

**Solution appliquée** :
- Renommé le persist Zustand en `mysteria-auth-state` (version bumped à 3 avec migration douce)
- GoTrueClient garde `mysteria-auth-storage` pour la session JWT
- Les deux clés cohabitent désormais sans collision

**🚨 NE JAMAIS** réutiliser une storageKey AsyncStorage qui est déjà consommée par une lib tierce. Toujours vérifier que la clé est unique au niveau projet.

---

## 5.22. ☠️ `addNotification` id non-UUID — INSERT silent fail (BUG MAJEUR depuis toujours)

**Symptôme historique** : Les notifs ne s'envoyaient JAMAIS aux autres membres. Quand quelqu'un assignait une tâche à un user, l'autre user ne voyait rien dans son onglet, pas de toast in-app, rien. La table `notifications` en DB était **vide** (0 row) malgré 5+ tâches créées historiquement.

**Cause racine** : `notifications-store.addNotification` générait l'id sous forme :
```typescript
id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

C'est une **string non-UUID**. Or la colonne `notifications.id` est un **UUID NOT NULL**. L'INSERT échouait silencieusement avec `invalid input syntax for type uuid: "notification-..."`. Le code logait juste `console.log('Erreur sync notification Supabase:', error)` mais le store gardait quand même la notif en local optimistic. Conséquences :
- Toutes les notifs (tâche assignée, invitation event, item Bible, notif admin manuelle) restaient **uniquement en local** sur le device du créateur
- Les autres users ne voyaient rien (pas d'INSERT en DB → pas d'event Realtime)
- Le toast in-app ne fire jamais
- L'Edge function `scheduled-reminders` avait le même bug avec `notification-${Date.now()}-...` → 0 notif jamais créée par le cron

**Solution appliquée** :
- Côté front : `import { v4 as uuidv4 } from 'uuid';` puis `id: uuidv4()`
- Côté Edge Deno : `const id = crypto.randomUUID();` (Deno natif, pas d'import)
- Edge function `scheduled-reminders` v3 redéployée

**🚨 TOUJOURS uuid v4** pour générer un id côté client qui pointe vers une colonne `uuid` Postgres. Idem pour `comments[].id` dans le jsonb (sinon collision théorique sur Date.now()+Math.random() entre 2 users simultanés).
