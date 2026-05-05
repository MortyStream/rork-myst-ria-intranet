-- ───────────────────────────────────────────────────────────────────────────
-- Seed du compte démo pour App Review (Apple / Google)
--
-- Pré-requis : le user `demo@mysteriaevent.ch` (rôle `membre`) DOIT déjà exister.
-- Création via /admin/user-form UNIQUEMENT (Hard Lesson §5.4 — jamais de SQL
-- direct sur auth.users).
--
-- Usage :
--   1. Récupérer l'UUID du user demo :
--        SELECT id FROM public.users WHERE email = 'demo@mysteriaevent.ch';
--   2. Remplacer la valeur de v_demo_user_id ci-dessous
--   3. Exécuter ce script dans le SQL Editor Supabase
--
-- Idempotence : tous les titres sont préfixés "[Demo]" pour pouvoir les
-- supprimer en bloc avant un re-seed via :
--   DELETE FROM public.tasks WHERE title LIKE '[Demo]%';
--   DELETE FROM public.events WHERE title LIKE '[Demo]%';
--   DELETE FROM public.resource_items WHERE title LIKE '[Demo]%';
--   DELETE FROM public.resource_categories WHERE name LIKE '[Demo]%';
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_demo_user_id uuid := '<DEMO_USER_ID_HERE>';  -- ⚠️ À REMPLACER
  v_category_id uuid := gen_random_uuid();
  v_now timestamptz := now();
BEGIN
  -- Garde-fou : si le UUID n'est pas remplacé, on bloque.
  IF v_demo_user_id::text = '<DEMO_USER_ID_HERE>' THEN
    RAISE EXCEPTION 'Remplacer v_demo_user_id par le vrai UUID du compte demo avant de lancer ce script';
  END IF;

  -- ── 1. Tâches ─────────────────────────────────────────────────────────────
  -- 3 tâches : 1 à faire (high prio, deadline +2j), 1 en cours (medium, +5j),
  -- 1 terminée (low, j-3) — montre les 3 statuts dans la liste.
  INSERT INTO public.tasks (
    title, description, "assignedTo", "assignedBy",
    deadline, priority, status, "approvalStatus",
    "createdAt", "updatedAt"
  ) VALUES
  (
    '[Demo] Préparer le brief plateau',
    'Lister les besoins technique pour la prochaine répétition générale.',
    jsonb_build_array(v_demo_user_id::text), v_demo_user_id,
    v_now + interval '2 days', 'high', 'pending', 'approved',
    v_now, v_now
  ),
  (
    '[Demo] Relire le script acte 2',
    'Annoter passages à retravailler, partager au metteur en scène.',
    jsonb_build_array(v_demo_user_id::text), v_demo_user_id,
    v_now + interval '5 days', 'medium', 'in_progress', 'approved',
    v_now, v_now
  ),
  (
    '[Demo] Réserver le minibus',
    'Trajet pour le festival — confirmation par email reçue.',
    jsonb_build_array(v_demo_user_id::text), v_demo_user_id,
    v_now - interval '3 days', 'low', 'completed', 'approved',
    v_now - interval '4 days', v_now - interval '3 days'
  );

  UPDATE public.tasks
  SET "completedAt" = v_now - interval '3 days', "completedBy" = v_demo_user_id
  WHERE title = '[Demo] Réserver le minibus';

  -- ── 2. Événements ─────────────────────────────────────────────────────────
  -- 2 events à venir : 1 répétition (J+3), 1 représentation (J+10),
  -- demo user listé comme participant "going" sur les deux.
  INSERT INTO public.events (
    title, description, "startTime", "endTime", location,
    color, participants, "createdBy", "createdAt", "updatedAt"
  ) VALUES
  (
    '[Demo] Répétition générale',
    'Filage complet acte 1 + acte 2. Costumes recommandés.',
    v_now + interval '3 days', v_now + interval '3 days 3 hours',
    'Salle communale, Renens', '#c22e0f',
    jsonb_build_array(jsonb_build_object(
      'userId', v_demo_user_id::text,
      'status', 'going',
      'respondedAt', v_now
    )),
    v_demo_user_id, v_now, v_now
  ),
  (
    '[Demo] Représentation publique',
    'Première — accueil 19h, début 20h, pot de l''amitié après.',
    v_now + interval '10 days', v_now + interval '10 days 3 hours',
    'Théâtre du Galpon, Genève', '#2563eb',
    jsonb_build_array(jsonb_build_object(
      'userId', v_demo_user_id::text,
      'status', 'going',
      'respondedAt', v_now
    )),
    v_demo_user_id, v_now, v_now
  );

  -- ── 3. Bible (catégorie + items) ──────────────────────────────────────────
  -- 1 catégorie publique + 2 items (1 lien + 1 texte) — démo de la base
  -- de connaissance, accès non restreint pour que demo y accède.
  INSERT INTO public.resource_categories (
    id, name, description, icon, "order", "restrictedAccess",
    "createdAt", "updatedAt"
  ) VALUES (
    v_category_id, '[Demo] Mémo asso',
    'Notes pratiques pour les nouveaux membres.',
    '📚', 100, false, v_now, v_now
  );

  INSERT INTO public.resource_items (
    title, type, description, "categoryId", url, "createdBy",
    "createdAt", "updatedAt"
  ) VALUES
  (
    '[Demo] Site officiel Mystéria',
    'link', 'Page d''accueil de l''asso.',
    v_category_id, 'https://mysteriaevent.ch',
    v_demo_user_id, v_now, v_now
  ),
  (
    '[Demo] Charte des bénévoles',
    'text', 'Bienvenue dans l''asso ! Ce mémo récapitule les bases : ponctualité aux répétitions, respect du matériel, communication via l''app.',
    v_category_id, NULL,
    v_demo_user_id, v_now, v_now
  );

  RAISE NOTICE 'Seed demo OK pour user_id = %', v_demo_user_id;
END $$;
