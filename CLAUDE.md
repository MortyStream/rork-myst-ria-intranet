# CLAUDE.md — Mystéria Event Intranet

> **Source de vérité racine.** Allégée et always-on. Le détail est éclaté dans `.claude/*.md`, à charger à la demande selon la tâche.

---

## Pitch projet

**MysteriaPP** — intranet mobile privé d'une **asso suisse de théâtre/événementiel** (~30 membres). Pas d'inscription publique : comptes créés par les admins. Distribution finale via App Store + Play Store (iOS + Android). Use cases : tâches collaboratives, calendrier d'events avec RSVP, base de connaissance "La Bible" (PDF/images/liens), annuaire, notifications, panneau admin.

---

## Stack en 1 paragraphe

**React Native 0.81** via **Expo SDK 54** (Expo Router file-based routing). State **Zustand** + persist AsyncStorage. Backend **Supabase** (project `toefttzpdexugvfdqhfg`, eu-west-1) — Postgres + Auth + Storage + Realtime + 2 Edge Functions Deno + pg_cron. **Client Supabase custom** dans `expo/utils/supabase.js` (assemble GoTrueClient + PostgrestClient + RealtimeClient + Storage maison) — choix volontaire avec cache JWT mémoire pour fix le timing post-login. Détail complet : `.claude/architecture.md`.

---

## Commandes essentielles

```powershell
cd C:\Users\MOOKI\mysteria-app\expo
npx expo start --tunnel --clear              # dev server avec tunnel ngrok
npm install <pkg> --legacy-peer-deps         # toujours avec ce flag (conflit React 19)
```

Reload sur device : secouer le téléphone → Reload. Hard reload : Ctrl+C puis relancer avec `--clear`.

---

## ⚠️ Top 5 garde-fous critiques

Ces 5 erreurs ont déjà été commises et ont coûté cher. Ne pas les ré-introduire. Détail + cause racine : `.claude/hard-lessons.md`.

1. **Pas de Mode Preview / fallback auto-loggué** (§5.1) — faille admin critique
2. **Pas d'INSERT auto-create de user dans le flow login** (§5.4) — la création se fait UNIQUEMENT dans `/admin/user-form`
3. **Pas de `reinitializeSupabase()` dans un retry** (§5.3) — casse le client global pour tous les autres stores
4. **Pas de RLS avec rôle `anon`** — la porte d'entrée est `signInWithPassword`, jamais d'accès anon en data
5. **uuid v4 obligatoire** pour les IDs côté client qui pointent vers une colonne `uuid` Postgres (§5.22) — JAMAIS de `Date.now()+Math.random()` (INSERT échoue silencieusement → bug fantôme garanti)

---

## Convention non-évidente

**Colonnes DB en `camelCase`**, pas snake_case : `createdAt`, `taskId`, `assignedTo`, `targetUserIds`, `supabaseUserId`. Toujours quoter dans le SQL : `"createdAt"`. Détail conventions complet : `.claude/conventions.md`.

---

## 📚 Quand lire quoi

Charge ces fichiers **à la demande** selon la tâche que tu fais. Aucun import auto — tu lis ce dont tu as besoin.

- **`.claude/architecture.md`** — Stack détaillé (versions exactes), arborescence, routing complet, tables des composants/stores/utils, communication client↔serveur, Edge Functions. **À lire pour** : ajouter un module/écran/store, comprendre où mettre du nouveau code, débuger un flux qui traverse plusieurs couches.

- **`.claude/conventions.md`** — Naming, TypeScript, state management, UI/UX (haptics, toast, ConfirmModal, touch targets), storage/files, RLS/security, async, comments, **patterns positifs ✅** (Optimistic UI, initialize retry, Realtime sync globale, sync différée offline, useEffect avec async/cancelled, signature stable de deps). **À lire pour** : écrire du nouveau code (composant, store, écran, utilitaire), revue de code, normaliser un pattern.

- **`.claude/hard-lessons.md`** — 17 leçons numérotées de bugs résolus avec symptôme + cause racine + solution + warning. Couvre : auth/JWT/sessions, RLS, ConfirmModal, expo-image-picker iOS, Supabase Storage, UUID Postgres, Expo Go limites, collision storageKey, etc. **À lire avant** : toucher à l'auth, aux RLS, au custom Supabase client, aux notifications, au storage, ou aux stores critiques. Quand un bug semble "déjà-vu", check ici en premier.

- **`.claude/roadmap.md`** — État courant (post-V3b, ~62% audit Salvatore traité), prochaines priorités (S/M effort + gros refactors L), idées features futures, commits récents, contacts et ressources externes (GitHub, Supabase, Resend, EAS), membres clés équipe. **À lire pour** : planifier une nouvelle feature, comprendre où on en est, identifier qui contacter.

- **`.claude/archive/`** — Items résolus ou obsolètes. Pas à lire en routine — sauf curiosité historique sur "comment on a fixé X".

---

## Principes de travail

- **Préserver le style** : la doc et les commentaires sont en **français informel**, parfois fr/en mixés. Ne pas tout angliciser.
- **Ne pas dupliquer** : une info vit à un seul endroit. Si elle est référencée depuis plusieurs contextes, le racine fait le pointer vers le fichier source.
- **Ne pas inventer** : si une convention semble manquer, vérifier dans `.claude/conventions.md` avant de proposer.
- **Mettre à jour Hard Lessons** : si tu fixes un bug subtil dont la cause racine est non-évidente, **ajoute une entrée à `hard-lessons.md`** plutôt que de juste committer le fix. Sinon le suivant le re-introduira.

---

*Pour toute question existentielle, lire `.claude/hard-lessons.md`. Pour toute nouvelle feature, lire `.claude/conventions.md` + `.claude/roadmap.md`.*
