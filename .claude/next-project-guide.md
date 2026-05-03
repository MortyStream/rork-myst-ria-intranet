# Guide Claude Code — Setup d'un nouveau projet

> Méta-guide tiré de l'expérience Mysteria. À copier dans tout nouveau projet pour partir avec les bons réflexes et éviter de re-payer les mêmes leçons.

---

## 0. Avant même de coder — naming & repo

### Conventions de nommage projet
- **Dossier local** : `kebab-case-lowercase` (ex: `mysteria-app`, pas `MysteriaPP`). Cross-platform Linux/macOS/Win, pas de surprise sur les FS sensibles à la casse.
- **Repo GitHub** : pareil, kebab-case.
- **Nom commercial visible dans l'UI** : libre. Le slug technique ≠ le nom marketing.
- **Bundle ID iOS/Android** : reverse domain (`ch.tonasso.app`). **Décide-le au début et touche-y plus jamais** — c'est ce qui te lie aux App Store / Play Store.
- **Slug Expo (`app.json`)** : kebab-case, identique au repo. Tu peux le changer plus tard sans drama tant que l'app n'est pas distribuée.

### `.gitignore` Claude Code dès le début

```gitignore
# Claude Code session data
.claude/worktrees/
.claude/agents/
.claude/projects/
.claude/skills/
.claude/transcripts/
.claude/settings.local.json
.claude/settings.json
.mcp.json
```

**Pourquoi ce pattern et pas `.claude/`** : tu vas vouloir tracker `.claude/*.md` (doc modulaire). Liste explicitement les sous-dossiers de session à ignorer plutôt que d'ignorer tout le dossier — sinon plus tard tu galères pour autoriser les .md.

---

## 1. CLAUDE.md modulaire dès le DÉBUT

> Le piège : démarrer avec un seul `CLAUDE.md` qui grossit. Sur Mysteria on est passé de 0 → 11 000 tokens en 2 semaines. C'est trop pour un always-on. **Pars modulaire dès le jour 1**, même si chaque fichier ne fait que 50 lignes au départ.

### Architecture cible

```
CLAUDE.md                    # racine ~1-3k tokens, always-on
.claude/
├── architecture.md          # stack, structure projet, choix techniques
├── conventions.md           # naming, style, patterns positifs
├── hard-lessons.md          # bugs résolus = warnings pour le futur (vide au début)
├── roadmap.md               # état courant, next steps, contacts
└── archive/                 # contenu obsolète, ne pas supprimer
```

### Template `CLAUDE.md` racine (à adapter)

```markdown
# CLAUDE.md — [NOM PROJET]

> Source de vérité racine. Allégée. Le détail est dans `.claude/*.md` à charger à la demande.

## Pitch projet
[3-5 lignes : qui, quoi, cible utilisateurs, plateformes]

## Stack
[1 paragraphe : framework + versions clés + backend + spécificités]

## Commandes essentielles
\`\`\`bash
[3-5 commandes pour lancer dev / install / build]
\`\`\`

## ⚠️ Top garde-fous critiques
[3-5 lignes max — les "ne JAMAIS" qui ont déjà coûté cher]

## Convention non-évidente
[1 paragraphe — ce qui surprend les nouveaux contributeurs]

## 📚 Quand lire quoi
- `.claude/architecture.md` — pour [contexte spécifique]
- `.claude/conventions.md` — pour [contexte spécifique]
- `.claude/hard-lessons.md` — avant de toucher à [zones sensibles]
- `.claude/roadmap.md` — pour planifier ou comprendre l'état

## Principes
- Préserver le style existant (FR informel / ce que tu veux)
- Pas de duplication
- Update hard-lessons quand tu fixes un bug subtil
```

### Pourquoi commencer modulaire dès le jour 1

- Les Hard Lessons s'accumulent vite (chaque bug subtil mérite sa note).
- Architecture détaillée grossit dès qu'on a 10+ écrans / 5+ stores.
- Si tu démarres en 1 fichier, tu paies un refactor à 10k+ tokens (= une demi-journée). Si tu démarres modulaire, t'as juste à append au bon fichier.

---

## 2. Hard Lessons transverses (à NE PAS re-payer)

Liste tirée de Mysteria, **applicable à tout projet React Native + Supabase**. Copie-les en bloc dans `hard-lessons.md` du nouveau projet.

### Auth / Sessions

1. **Cache JWT mémoire après `signInWithPassword`** : ne te fie jamais à `getSession()` qui peut renvoyer null pendant 50-200ms post-login (timing async AsyncStorage). Stocke le token dans une variable JS module-level, propage-le au fetch wrapper, fallback `getSession()`.

2. **`storageKey` GoTrueClient ≠ Zustand persist auth-store**. Ne JAMAIS utiliser la même clé AsyncStorage pour les deux — Zustand écrase la session GoTrue à chaque update du store → user déconnecté à chaque cold start. Convention : `<projet>-auth-storage` pour GoTrue, `<projet>-auth-state` pour Zustand.

3. **Pas de fallback "user fantôme" / "Mode Preview"** — même temporaire en dev. C'est une faille admin garantie le jour où tu oublies de la retirer.

4. **Pas d'INSERT auto-create de user dans le flow login**. Les profils créés UNIQUEMENT par les admins via un screen dédié. Les fonctions `linkUser`/`syncUser` doivent être best-effort (return false silencieux si rien trouvé).

5. **Intercepteur 401 → refresh → retry** dans le custom client Supabase. Sans ça, si JWT expire en cours d'usage → requêtes en anon → données vides silencieuses → user confus. Avec mutex partagé (promise) pour éviter N refresh en parallèle.

### Database / RLS / IDs

6. **uuid v4 obligatoire** côté client pour générer un id qui pointe vers une colonne `uuid` Postgres. JAMAIS de `Date.now()+Math.random()` — l'INSERT échoue silencieusement (`invalid input syntax for type uuid`) et tu ne le vois que des semaines après quand tu te demandes pourquoi la table est vide.

7. **Sanitize les UUIDs nullables** : si une string `""` arrive (ex via `useLocalSearchParams`), convertis en `null` avant INSERT. Postgres rejette `""` pour `uuid`.

8. **Pas de RLS avec rôle `anon`** — la porte d'entrée doit être `signInWithPassword`.

9. **WITH CHECK strict** sur les UPDATE/INSERT : `supabaseUserId = auth.uid()` ou un helper admin dans schéma `private` (pas exposé via PostgREST).

10. **Pour les jsonb modifiés concurremment** (réactions, participants, etc.), utiliser une **RPC Postgres avec `SELECT FOR UPDATE`** plutôt qu'un UPDATE direct du jsonb. Sinon last-write-wins → perte de données.

### Storage / Files

11. **`sanitizeFilename()` avant tout upload Supabase Storage**. Espaces, accents, caractères spéciaux → erreur 400 "Invalid key".

12. **Compresser les images avant upload** (1024px max, quality 0.7). Économie 90% de bande passante + storage.

13. **`expo-image-picker`** : toujours `mediaTypes: ['images']` (SDK 54+ array), `selectionLimit: 1`, `allowsMultipleSelection: false`, `exif: false`, `base64: false`. Sinon iOS PHPicker bloqué (checkmark sans bouton "Add").

14. **`expo-file-system/legacy`** pas `expo-file-system` (deprecated en SDK 54).

### State / UI

15. **Optimistic UI + snapshot/rollback ciblé** sur les actions fréquentes. Snapshot **uniquement les IDs touchés**, pas tout l'array — sinon le rollback écrase aussi les changements d'autres devices via Realtime entre l'optimistic et la réponse.

16. **Idempotence client** sur les actions toggleables : `markAsRead` ne doit pas appeler l'API si déjà read. Évite le spam sur tap-tap-tap.

17. **`React.memo` sur les list items** (TaskItem, NotificationItem, UserListItem). Sans, chaque update Realtime re-render TOUTES les rows. Très visible avec 30+ items.

18. **Initialize* avec retry x3 backoff** (200/400/600ms) sur tous les fetch initiaux. Couvre le timing JWT post-login.

19. **Si la DB retourne 0 rows à l'init, écris quand même `[]` dans le store** — ne garde pas le cache local. Sinon les rows supprimées en DB persistent indéfiniment en local (bug fantôme garanti).

20. **`useEffect` deps : signature stable** quand une dep change trop souvent (ex `tasks` array qui mute à chaque update Realtime). Sinon `setTimeout` perpétuellement annulé → fonction jamais exécutée.

21. **Async dans `useEffect` → flag `cancelled`**. Si l'effect cleanup arrive avant que la promise résolve, sans flag tu assignes quand même → memory leak / double events.

### UI/UX cohérence

22. **Pas d'`Alert.alert`** dans le code applicatif. Pour confirmations : `<ConfirmModal>` custom. Pour feedback succès/erreurs : `Toast.show()` avec `toastConfig` adapté dark/light. L'`Alert` natif Android est immonde, et celui d'iOS est bloquant + hors-thème.

23. **Touch targets ≥ 44pt** (HIG iOS). Padding 10 minimum sur les boutons icône 24px, sinon App Store Review râle et l'UX est moche.

24. **Haptic feedback** : `tapHaptic` toggle, `successHaptic` save/login, `warningHaptic` suppression, `mediumHaptic` ouverture menu long-press. PAS de haptic sur navigation simple (anti-fatigue tactile). Import statique, pas dynamique.

25. **Toast `react-native-toast-message`** : configure un `toastConfig` custom avec border-left coloré + icon bubble + bg `theme.card` adapté dark/light. Le défaut blanc jure en dark mode.

26. **Pas de chaînage de 2 ConfirmModal** où le 2ème dépend d'un state que le 1er `onDismiss` modifie. Soit un seul modal, soit refactor le composant.

### Build / Production

27. **`babel-plugin-transform-remove-console`** en mode prod (preserve `error` et `warn`). Sinon les logs de dev pollue le bundle prod et fuite des infos.

28. **Stripping des `console.log`** : préfixe-les `[Domain]` pour pouvoir les filtrer (`[Auth]`, `[Realtime]`, `[Queue]`).

29. **`logout` async + await `unregisterPushToken`**. Sans await, la requête DELETE peut partir après `signOut` qui clear le token → 401 → token reste en DB.

30. **Strict TypeScript pas obligatoire en RN+Expo** (Metro ne typecheck pas), mais `tsc --noEmit` en pre-commit hook si tu veux pas accumuler de la dette `as any`.

### Communication & docs

31. **Update `hard-lessons.md` quand tu fixes un bug subtil**. Sinon le suivant le re-introduit. C'est exactement pour ça que le fichier existe.

32. **Commits explicites** : un commit message qui explique la **cause racine** + **le fix** est 10x plus utile que "fix: bug auth". Quand tu reviens 3 mois plus tard, t'as la doc dans `git log`.

---

## 3. Templates de démarrage `.claude/*.md`

### `architecture.md` (squelette)

```markdown
# Architecture — [PROJET]

## 1. Project Vision
[Qui, quoi, cible, use cases]

## 2. Tech Stack
[Tableau composants/versions/rôle]

## 3. Architecture Globale
[Arbo, routing, components, stores, utils, comm client/serveur]
```

### `conventions.md` (squelette)

```markdown
# Conventions de Code & Patterns

## 1. Naming
[Tableau type/convention/exemples]

## 2. TypeScript
## 3. State management
## 4. UI/UX
## 5. Storage / Files
## 6. Patterns positifs ✅
[Optimistic UI, initialize retry, Realtime sync, sync différée offline]

## 7. RLS / Security
## 8. Async patterns
## 9. UUID & jsonb
## 10. Comments
```

### `hard-lessons.md` (squelette)

```markdown
# Hard Lessons — Bugs résolus, pièges à éviter

> Légende : ☠️ critique · 🟠 bloquant · 🟢 pattern positif (déplacé conventions)

## 5.1. ☠️ [titre court]
**Symptôme historique** : ...
**Cause racine** : ...
**Solution appliquée** : ...
**🚨 NE JAMAIS** ...
```

Numérote 5.1, 5.2, etc. (préserve les numéros même si une leçon devient obsolète → archive avec son numéro). Permet de référencer "cf. §5.X" partout dans le code.

### `roadmap.md` (squelette)

```markdown
# Roadmap, état courant & contacts

## État courant
[Livré, bugs résiduels, en attente externe]

## 🔥 Priorités prochaines sessions
[Court terme + long terme]

## ⚠️ NE PAS FAIRE (rappel top 5)
[Pointe vers hard-lessons]

## 🛠️ Commits récents
[Tableau hash/sujet]

## 📞 Contacts & Ressources
[GitHub, services tiers, équipe]
```

---

## 4. Workflow de session avec Claude Code

### Avant de démarrer une session
- `git status` — clean ? Sinon commit ou stash en cours.
- Donne le contexte à Claude : "On a fait X la dernière fois, aujourd'hui je veux Y."

### Pendant
- **Demande explicitement quel fichier lire** : "Lis `.claude/hard-lessons.md` avant de toucher à l'auth." Sinon Claude se base sur le racine léger seulement.
- **Refuse les "ça devrait marcher"** : Claude se trompe. Demande des tests réels sur device.
- **Profite de la délégation** : pour les audits, balance un agent (`Agent` tool). Pour les recherches multi-fichiers, idem.

### Avant un changement risqué
- Commit de sauvegarde avec un message clair (`chore: backup before X`).
- Si tu touches à l'auth / au RLS / au custom client : check `hard-lessons.md` avant.

### Après un fix subtil
- **Update `hard-lessons.md`** avec la nouvelle leçon (symptôme + cause + solution + warning).
- Commit avec un message qui explique la cause racine.

### Quand re-modulariser
- Si `CLAUDE.md` racine dépasse **5 000 tokens**, refactor obligatoire.
- Si un fichier modulaire dépasse **8 000 tokens**, scinde-le par domaine.

---

## 5. Setup Supabase recommandé (RN + Expo)

Cf. Mysteria — fais pareil :

1. **Custom client Supabase** plutôt que SDK officiel : tu contrôles les headers, le cache JWT, et tu réduis le bundle. Mais c'est un investissement initial (300-400 lignes). Vaut le coup à partir d'un projet sérieux.
2. **Schéma `private` pour les helpers SQL** (`is_admin()`, `current_user_internal_id()`). Pas exposé via PostgREST.
3. **Migrations versionnées** : `supabase migration new <name>`. Jamais de SQL editor sans migration.
4. **Realtime activé sélectivement** sur les tables qui en ont besoin (publication `supabase_realtime` + REPLICA IDENTITY FULL).
5. **RPC Postgres** pour les opérations atomiques sur jsonb (toggle reaction, etc.).
6. **Edge Functions Deno** pour les jobs scheduled (pg_cron + pg_net) ou les actions sensibles côté server (envoi email Resend).

---

## 6. Outils tiers à installer dès le début

```bash
# expo
npx create-expo-app -t default
cd <project>

# essentiels
npm install zustand @react-native-async-storage/async-storage --legacy-peer-deps
npm install @supabase/auth-js @supabase/postgrest-js @supabase/realtime-js --legacy-peer-deps
npm install lucide-react-native react-native-toast-message --legacy-peer-deps
npm install @react-native-community/netinfo react-native-gesture-handler --legacy-peer-deps
npm install uuid --legacy-peer-deps

# dev
npm install --save-dev babel-plugin-transform-remove-console --legacy-peer-deps
```

`babel.config.js` :
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    env: {
      production: {
        plugins: [["transform-remove-console", { exclude: ["error", "warn"] }]],
      },
    },
  };
};
```

---

## 7. Checklist avant la 1ère session de codage

- [ ] Repo GitHub créé + clone local
- [ ] `.gitignore` avec patterns Claude Code (cf. §0)
- [ ] `CLAUDE.md` racine + 4 fichiers `.claude/*.md` créés depuis les templates
- [ ] Bundle ID iOS/Android décidé et écrit dans `app.json` (jamais le rechanger)
- [ ] Project Supabase créé, project ID dans CLAUDE.md
- [ ] `babel-plugin-transform-remove-console` installé
- [ ] Custom Supabase client pré-pensé (pas obligé d'écrire les 400 lignes le jour 1, mais identifie la structure)
- [ ] 1er commit "chore: initial setup" propre

---

*Bonne route. Quand un truc te surprend pendant le projet → `hard-lessons.md`. Toujours.*
