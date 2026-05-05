import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sauvegarde automatique d'un brouillon de form dans AsyncStorage (Feature F3).
 *
 * Usage typique :
 *   const { draft, isLoaded, clearDraft } = useFormDraft<FormValues>(
 *     'task-form-draft',
 *     { title, description, deadline, ... },
 *     { enabled: !existingTaskId }  // ne drafter que la création, pas l'édition
 *   );
 *
 *   // Au mount, draft est null si pas de draft, sinon les valeurs sauvegardées.
 *   useEffect(() => {
 *     if (draft) {
 *       setTitle(draft.title);
 *       setDescription(draft.description);
 *     }
 *   }, [isLoaded]);
 *
 *   // Au save final, clear le draft :
 *   await clearDraft();
 *
 * @param key clé AsyncStorage unique (ex: 'task-form-draft', 'event-form-draft')
 * @param values objet courant des valeurs du form (sera serialisé)
 * @param options.enabled désactive le draft (édition d'une row existante p. ex.)
 * @param options.debounceMs délai entre la dernière modif et la sauvegarde (default 500ms)
 */
export function useFormDraft<T extends Record<string, any>>(
  key: string,
  values: T,
  options: { enabled?: boolean; debounceMs?: number } = {}
): { draft: T | null; isLoaded: boolean; clearDraft: () => Promise<void> } {
  const { enabled = true, debounceMs = 500 } = options;
  const [draft, setDraft] = useState<T | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitialLoadFiredRef = useRef(false);

  // Load au mount
  useEffect(() => {
    if (!enabled) {
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((json) => {
        if (cancelled) return;
        if (json) {
          try {
            setDraft(JSON.parse(json) as T);
          } catch {
            // JSON corrompu : on ignore + on clear
            AsyncStorage.removeItem(key).catch(() => {});
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Save debounced quand values change. On skip le tout 1er render pour
  // éviter d'overwrite le draft chargé avec les valeurs initiales du form.
  useEffect(() => {
    if (!enabled || !isLoaded) return;
    if (!hasInitialLoadFiredRef.current) {
      hasInitialLoadFiredRef.current = true;
      return;
    }
    const t = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(values)).catch((e) => {
        console.log('[useFormDraft] save error (non-blocking):', e);
      });
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, isLoaded, key, debounceMs, enabled]);

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setDraft(null);
    } catch {}
  };

  return { draft, isLoaded, clearDraft };
}
