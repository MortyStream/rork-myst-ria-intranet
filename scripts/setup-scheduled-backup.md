# Configurer le backup automatique toutes les 48h

## Étape 1 : Tester le script manuellement (1 min)

Ouvre PowerShell et tape :

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\MOOKI\rork-myst-ria-intranet\scripts\auto-backup.ps1"
```

Tu devrais voir :
- Soit `Aucun changement à sauvegarder — skip.`
- Soit un commit + push sur GitHub avec un tag `auto-backup-YYYYMMDD-HHMM`

Si ça marche, passe à l'étape 2.

---

## Étape 2 : Programmer dans le Planificateur de tâches Windows (5 min)

1. Tape **`Planificateur de tâches`** dans le menu Démarrer → ouvre l'app
2. Clique **`Créer une tâche...`** (panneau de droite)
3. Onglet **Général** :
   - Nom : `Mystéria Intranet — Auto-Backup`
   - Description : `Sauvegarde Git toutes les 48h`
   - Coche **`Exécuter même si l'utilisateur n'est pas connecté`**
4. Onglet **Déclencheurs** → **`Nouveau`** :
   - Lancer la tâche : `Selon une planification`
   - Paramètres : `Quotidien`, **toutes les 2 jours** (= 48h)
   - Heure de début : **02:00** (ou ce qui t'arrange, idéalement la nuit)
   - Coche **`Activé`**
5. Onglet **Actions** → **`Nouvelle`** :
   - Action : `Démarrer un programme`
   - Programme/script : `powershell.exe`
   - Arguments :
     ```
     -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\MOOKI\rork-myst-ria-intranet\scripts\auto-backup.ps1"
     ```
6. Onglet **Conditions** :
   - Décoche **`Démarrer la tâche uniquement si l'ordinateur est sur le secteur`** (si tu veux que ça marche aussi sur batterie)
   - Coche **`Réactiver l'ordinateur pour exécuter cette tâche`** si ton PC dort la nuit
7. Onglet **Paramètres** :
   - Coche **`Autoriser la tâche à être exécutée à la demande`**
   - Coche **`Si l'exécution échoue, redémarrer toutes les`** : 1 heure, 3 tentatives
8. Clique **OK** — Windows te demande peut-être ton mot de passe pour la tâche (entrer celui de ta session)

---

## Étape 3 : Vérifier que ça tourne

- Logs : ouvre `C:\Users\MOOKI\rork-myst-ria-intranet\scripts\backup.log`
- GitHub : tu verras des tags `auto-backup-YYYYMMDD-HHMM` apparaître toutes les 48h
- Pour forcer une exécution : Planificateur → ta tâche → clic droit → **Exécuter**

---

## Restaurer un backup

Pour revenir à une sauvegarde particulière :

```powershell
cd C:\Users\MOOKI\rork-myst-ria-intranet
git checkout auto-backup-20260428-0200
```

Pour repartir sur la branche actuelle :

```powershell
git checkout main
```

Pour rollback total (écrase main, à utiliser avec parcimonie) :

```powershell
git reset --hard auto-backup-20260428-0200
git push --force origin main
```

---

## Désactiver / supprimer la tâche

Planificateur de tâches → ta tâche → clic droit → **Désactiver** ou **Supprimer**.
