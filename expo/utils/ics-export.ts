// Expo SDK 54+ : on garde l'API legacy de expo-file-system (cf. file-cache.ts).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Event } from '@/types/calendar';

/**
 * Génère un fichier .ics (iCalendar RFC 5545) à partir d'un Event Mystéria
 * et déclenche le partage natif. Apple Calendar / Google Calendar / Outlook
 * importent ce format directement (le user tape le fichier → "Ajouter" iOS,
 * "Ouvrir avec Calendrier" Android).
 *
 * Pas de TZID : on utilise du UTC (Z) en sortie pour éviter les problèmes
 * d'interprétation cross-timezone.
 */
export async function exportEventToIcs(event: Event): Promise<{ ok: boolean; reason?: string }> {
  try {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    const ics = buildIcsContent(event, start, end);

    // Nom de fichier safe : on enlève les accents + caractères spéciaux
    const safeTitle = event.title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'event';
    const fileName = `${safeTitle}.ics`;

    const fileUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, ics, { encoding: FileSystem.EncodingType.UTF8 });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { ok: false, reason: 'Le partage de fichier n\'est pas disponible sur cet appareil.' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Ajouter à mon calendrier',
      UTI: 'com.apple.ical.ics',
    });

    return { ok: true };
  } catch (error) {
    console.warn('[ics-export] failed:', error);
    return { ok: false, reason: (error as Error)?.message ?? 'Erreur inconnue' };
  }
}

function buildIcsContent(event: Event, start: Date, end: Date): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mysteria Event//Intranet//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@mysteriaevent.ch`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${escapeIcsText(event.url)}`);
  }
  // F4 récurrence : map vers RRULE iCalendar
  const rrule = mapRecurrence(event.recurrence ?? null);
  if (rrule) lines.push(`RRULE:${rrule}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // Fold à 75 octets selon RFC 5545 (utilisé par les apps strictes — Outlook).
  // CRLF mandatoire entre lignes.
  return lines.map(foldLine).join('\r\n');
}

function formatIcsDate(d: Date): string {
  // Format UTC "YYYYMMDDTHHMMSSZ"
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(s: string): string {
  // RFC 5545 §3.3.11 : escape \, ;, ,, et newlines.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let rest = line;
  // 1ère ligne : 75 chars
  out.push(rest.slice(0, 75));
  rest = rest.slice(75);
  // Suivantes : 74 chars + leading space (continuation marker)
  while (rest.length > 0) {
    out.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return out.join('\r\n');
}

function mapRecurrence(r: string | null): string | null {
  switch (r) {
    case 'weekly': return 'FREQ=WEEKLY';
    case 'biweekly': return 'FREQ=WEEKLY;INTERVAL=2';
    case 'monthly': return 'FREQ=MONTHLY';
    case 'yearly': return 'FREQ=YEARLY';
    default: return null;
  }
}
