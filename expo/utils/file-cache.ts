// Expo SDK 54 a déprécié l'API classique de expo-file-system au profit de
// File/Directory classes. On garde l'API legacy le temps de migrer (TODO :
// migrer vers la nouvelle API qui est plus performante).
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Cache local des fichiers de La Bible.
 *
 * Stratégie :
 * - Tous les fichiers téléchargés sont stockés dans `documentDirectory + bible-cache/`
 * - On utilise `documentDirectory` (persistant) plutôt que `cacheDirectory`
 *   parce que iOS peut purger `cacheDirectory` quand le système manque de place.
 *   La Bible étant l'usage principal hors-ligne, on veut garder les fichiers.
 * - Filename = `${itemId}.${ext}` — l'itemId est unique, donc collision impossible.
 * - Si un même itemId a une nouvelle URL (le fichier a été ré-uploadé), on
 *   re-télécharge automatiquement (l'ancien est écrasé).
 */

const CACHE_DIR = `${FileSystem.documentDirectory}bible-cache/`;

interface CachedFile {
  /** URI local prêt à passer à Sharing.shareAsync ou Linking.openURL. */
  localUri: string;
  /** Taille en bytes. */
  size: number;
  /** True si le fichier vient du cache (pas re-téléchargé). */
  fromCache: boolean;
}

/**
 * Vérifie que le dossier de cache existe (création si besoin).
 */
async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Extrait l'extension depuis une URL Supabase Storage.
 * Ex: "https://x.supabase.co/storage/v1/.../1234-doc.pdf?xxx" → "pdf"
 */
function getExtFromUrl(url: string): string {
  // Vire les query params + le fragment
  const cleanUrl = url.split('?')[0].split('#')[0];
  const lastDot = cleanUrl.lastIndexOf('.');
  const lastSlash = cleanUrl.lastIndexOf('/');
  if (lastDot > lastSlash) {
    return cleanUrl.substring(lastDot + 1).toLowerCase();
  }
  return 'bin'; // fallback
}

/**
 * Vérifie si un fichier est déjà en cache local.
 * Utilisé pour afficher un badge "✓ Disponible hors ligne" sur les items.
 */
export async function isFileCached(itemId: string, remoteUrl: string): Promise<boolean> {
  try {
    await ensureCacheDir();
    const ext = getExtFromUrl(remoteUrl);
    const localPath = `${CACHE_DIR}${itemId}.${ext}`;
    const info = await FileSystem.getInfoAsync(localPath);
    return info.exists && info.size > 0;
  } catch {
    return false;
  }
}

/**
 * Récupère un fichier depuis le cache local s'il existe, sinon le télécharge.
 * Lève une exception si le téléchargement échoue ET qu'aucune version cachée n'existe.
 */
export async function getCachedOrDownload(
  itemId: string,
  remoteUrl: string
): Promise<CachedFile> {
  await ensureCacheDir();

  const ext = getExtFromUrl(remoteUrl);
  const localPath = `${CACHE_DIR}${itemId}.${ext}`;

  // 1. Si le fichier est déjà en cache, le retourner directement
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists && info.size > 0) {
    return {
      localUri: info.uri,
      size: info.size,
      fromCache: true,
    };
  }

  // 2. Sinon, télécharger
  const result = await FileSystem.downloadAsync(remoteUrl, localPath);
  if (result.status !== 200) {
    // Si on a une copie cachée (taille 0 ou bug précédent), on la nettoie
    try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch {}
    throw new Error(`Téléchargement échoué (HTTP ${result.status})`);
  }

  const newInfo = await FileSystem.getInfoAsync(result.uri);
  return {
    localUri: result.uri,
    size: newInfo.exists ? (newInfo.size ?? 0) : 0,
    fromCache: false,
  };
}

/**
 * Supprime un fichier du cache (utile pour libérer de l'espace ou forcer re-download).
 */
export async function removeFromCache(itemId: string, remoteUrl: string): Promise<void> {
  try {
    const ext = getExtFromUrl(remoteUrl);
    const localPath = `${CACHE_DIR}${itemId}.${ext}`;
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  } catch (err) {
    console.warn('removeFromCache failed:', err);
  }
}

/**
 * Calcule la taille totale du cache (en bytes).
 */
export async function getCacheSize(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) return 0;
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let total = 0;
    for (const name of files) {
      const fileInfo = await FileSystem.getInfoAsync(CACHE_DIR + name);
      if (fileInfo.exists && fileInfo.size) total += fileInfo.size;
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Vide complètement le cache (action utilisateur explicite — bouton dans réglages).
 */
export async function clearCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (err) {
    console.warn('clearCache failed:', err);
  }
}

/**
 * Format human-readable d'une taille en bytes.
 * Ex: 1234 → "1.2 KB", 1500000 → "1.4 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
