import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Sanitize un nom de fichier pour Supabase Storage.
 * Supabase rejette les keys avec espaces, accents, et certains caractères spéciaux.
 * Cette fonction :
 *  - Retire les accents (NFD + remove combining marks)
 *  - Remplace tout caractère non [A-Za-z0-9._-] par _
 *  - Limite à 100 caractères
 *  - Préserve l'extension (.pdf, .jpg, etc.)
 *
 * Ex: "26.04.15_PV Réunion Mystéria signé.pdf" → "26.04.15_PV_Reunion_Mysteria_signe.pdf"
 */
export function sanitizeFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;

  const cleanName = name
    .normalize('NFD')                       // sépare accents
    .replace(/[̀-ͯ]/g, '')        // retire accents
    .replace(/[^A-Za-z0-9._-]/g, '_')       // remplace tout autre caractère
    .replace(/_+/g, '_')                    // dédoublonne les _
    .replace(/^_|_$/g, '')                  // trim _ aux extrémités
    .substring(0, 100);                     // limite la longueur

  const cleanExt = ext
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9.]/g, '')
    .toLowerCase();

  return cleanName + cleanExt || 'file';
}

interface CompressOptions {
  /** Largeur max en pixels (l'image est redimensionnée en gardant le ratio). Par défaut 1024. */
  maxWidth?: number;
  /** Qualité JPEG, entre 0 et 1. Par défaut 0.7. */
  quality?: number;
  /** Format de sortie. Par défaut 'jpeg' (taille la plus compacte). */
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  /** MIME type prêt à passer à Supabase Storage. */
  mimeType: string;
  /** Extension associée. */
  extension: 'jpeg' | 'png' | 'webp';
}

/**
 * Compresse et redimensionne une image avant upload.
 *
 * - Ramène la largeur max à `maxWidth` (1024px par défaut), hauteur proportionnelle
 * - Encode en JPEG 70% par défaut → ~80% de taille en moins vs photo iPhone brute
 * - Retourne un URI cache local prêt à fetch + upload
 *
 * Si la compression échoue pour une raison quelconque, retourne l'URI d'origine
 * sans planter — l'upload se fait juste avec l'image brute.
 */
export async function compressImage(
  uri: string,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1024,
    quality = 0.7,
    format = 'jpeg',
  } = options;

  const saveFormat =
    format === 'png'
      ? ImageManipulator.SaveFormat.PNG
      : format === 'webp'
        ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: saveFormat,
      }
    );

    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpeg';
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType: `image/${ext}`,
      extension: ext,
    };
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return {
      uri,
      width: 0,
      height: 0,
      mimeType: 'image/jpeg',
      extension: 'jpeg',
    };
  }
}
