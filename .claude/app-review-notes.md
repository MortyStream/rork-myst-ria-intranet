# App Review Notes — Mystéria Intranet

> Documents nécessaires pour la soumission App Store (Apple) / Play Store (Google). À fournir tels quels au moment du submit EAS.

---

## 1. Identité de l'app

| Champ | Valeur |
|---|---|
| Nom | Mystéria Intranet |
| Bundle ID iOS / Android | `ch.mysteriaevent.intranet` |
| EAS project | `b2bdb0b9-18cf-40a6-be2c-c7dc1de3333c` |
| Catégorie principale | Productivity / Productivité |
| Catégorie secondaire | Business / Affaires |
| Classification d'âge | 4+ |
| Site éditeur | mysteriaevent.ch |
| Email contact | mxrtystream@gmail.com |

---

## 2. Description publique

### Français (3990 chars max App Store)

> Mystéria Intranet est l'application interne et privée de l'association suisse Mystéria Event, dédiée à l'organisation d'événements théâtraux et culturels.
>
> L'application est réservée aux membres invités de l'association. Aucune inscription publique n'est possible : les comptes sont créés par les administrateurs.
>
> Fonctionnalités :
> • Tâches collaboratives avec deadlines, priorités, pièces jointes (photos / fichiers / liens) et commentaires temps réel.
> • Calendrier des événements avec RSVP (J'y serai / Peut-être / Décliné), récurrence (hebdomadaire, mensuelle…) et rappels automatiques.
> • La Bible — base de connaissance interne (PDF, images, liens) classée par catégories.
> • Annuaire des membres avec rôles (admin, responsable de pôle, responsable de secteur, membre).
> • Notifications push pour deadlines, nouveaux événements, mentions et changements de statut.
> • Mode "Ne pas déranger" avec plage horaire personnalisable.
> • Mode sombre.
>
> Mystéria Intranet centralise la coordination de l'asso : du brainstorming des spectacles à la logistique technique.

### English (3990 chars max App Store)

> Mystéria Intranet is the private internal app of the Swiss association Mystéria Event, dedicated to organizing theatre and cultural events.
>
> The app is restricted to invited members of the association. No public sign-up is available: accounts are created by administrators.
>
> Features:
> • Collaborative tasks with deadlines, priorities, attachments (photos / files / links) and real-time comments.
> • Event calendar with RSVP (Going / Maybe / Declined), recurrence (weekly, monthly…) and automatic reminders.
> • The Bible — internal knowledge base (PDFs, images, links) organized by categories.
> • Member directory with roles (admin, pole leader, sector leader, member).
> • Push notifications for deadlines, new events, mentions and status changes.
> • Do Not Disturb mode with customizable time range.
> • Dark mode.
>
> Mystéria Intranet centralizes association coordination: from show brainstorming to technical logistics.

---

## 3. App Review Notes (zone privée Apple/Google)

> ⚠️ Cette zone est lue par les reviewers Apple/Google. Important pour passer le review **4.2 Minimum Functionality** + **5.1 Privacy** sans rejet.

### Texte type pour les reviewers (FR/EN combiné)

```
Hello reviewer,

This app is the PRIVATE internal intranet of "Mystéria Event", a Swiss
non-profit theatre/cultural association (~30 members). It is NOT a public
service. Public sign-up is intentionally disabled: accounts are created
by administrators only and distributed to invited members.

To allow you to review the app, we provide a demo account below. This
demo account has the "membre" (member) role and limited access — it
showcases the main user-facing features (tasks, calendar, knowledge base,
directory, notifications, settings). It does NOT have admin access.

Demo credentials:
  Email:    demo@mysteriaevent.ch
  Password: [À REMPLIR PAR KÉVIN AU MOMENT DU SUBMIT]

If you need admin-level review, please reply and we will provision a
temporary admin account.

The app uses Supabase (EU-region, Frankfurt) for authentication and
storage. All data is private to the association. No public API endpoints
expose member data. Push notifications are sent through Expo Push API.

Thank you,
Kevin Perret — President, Mystéria Event
mxrtystream@gmail.com
```

---

## 4. Privacy & Permissions

### iOS — Info.plist usage descriptions à renseigner

| Permission | Texte FR | Texte EN |
|---|---|---|
| `NSCameraUsageDescription` | Ajouter une photo en pièce jointe d'une tâche ou comme avatar de profil. | Add a photo as task attachment or profile avatar. |
| `NSPhotoLibraryUsageDescription` | Choisir une image existante depuis votre galerie pour les pièces jointes ou l'avatar. | Pick an existing image from your library for attachments or avatar. |
| `NSUserNotificationsUsageDescription` | Recevoir des rappels de tâches et d'événements. | Receive task and event reminders. |

### Android — runtime permissions déjà déclarées dans `app.json`

- `RECEIVE_BOOT_COMPLETED` (re-armer rappels au reboot)
- `VIBRATE` (haptic feedback)
- `POST_NOTIFICATIONS` (Android 13+)

### Privacy questionnaire (App Store Connect)

| Question | Réponse |
|---|---|
| Collectez-vous des données ? | Oui |
| Données collectées | Email, nom, prénom (compte), contenu utilisateur (tâches, commentaires, fichiers uploadés) |
| Données liées à l'identifiant ? | Oui (toutes — c'est l'objet d'un intranet) |
| Tracking | Non |
| Données partagées avec tiers ? | Non (Supabase = sous-traitant, pas tiers) |

---

## 5. Compte démo — instructions de provisioning

> **À faire AVANT le submit final.** Le compte démo doit être actif et peuplé sinon les reviewers rejettent.

1. Se connecter en admin → `/admin/user-form` (NE PAS créer via SQL — cf. Hard Lesson §5.4)
2. Renseigner :
   - Email : `demo@mysteriaevent.ch`
   - Prénom : `Demo`
   - Nom : `Reviewer`
   - Rôle : `membre`
   - Mot de passe : générer un mdp fort, le noter dans la note pour reviewers
3. Une fois créé, récupérer son UUID `users.id` (visible dans `/admin/database` ou via SQL)
4. Lancer `supabase/seed_demo_data.sql` en remplaçant `:demo_user_id` par l'UUID
5. Vérifier sur device : login avec demo creds → 3 tâches assignées + 2 events + 1 catégorie Bible visibles

---

## 6. Screenshots à fournir (par store)

### App Store iOS — 6.7" iPhone Pro Max requis

1. Liste des tâches avec section "À valider" (mode admin/RS)
2. Détail d'une tâche avec commentaires et pièce jointe
3. Calendrier mensuel + détail event RSVP
4. La Bible (vue catégories + détail PDF)
5. Annuaire (carte d'un membre)
6. Notifications groupées par jour
7. Settings — mode sombre activé + Mode "Ne pas déranger"

### Play Store Android — Phone (16:9 ou 9:16)

Mêmes vues que iOS, captures Android 11+.

### Tablet iPad (12.9" Pro requis si `supportsTablet: true` dans `app.json`)

3 captures minimum sur les vues principales (tasks list, calendar, Bible).

---

## 7. Checklist avant submit

- [ ] EAS Build production réussi sur iOS + Android (`eas build --profile production --platform all`)
- [ ] Compte démo créé + peuplé (cf. §5)
- [ ] Mot de passe demo noté dans App Review Notes (§3)
- [ ] Screenshots générés sur device réel (§6)
- [ ] Privacy questionnaire rempli dans App Store Connect (§4)
- [ ] Permissions Info.plist renseignées (§4)
- [ ] Description FR + EN copiée dans les 2 stores (§2)
- [ ] App Review Notes texte collé (§3)
- [ ] DNS Resend vert AVANT le submit final (sinon "Reporter un bug" inactif côté reviewer)

---

*Dernière update : 2026-05-06.*
