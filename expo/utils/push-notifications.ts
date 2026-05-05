import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from './supabase';

// expo-notifications remote push was removed from Expo Go in SDK 53+.
// We must NEVER require() the package in Expo Go — even a static import
// at module level will execute side-effect code and crash.
const isExpoGo = Constants.appOwnership === 'expo';
const isSupported = Platform.OS !== 'web' && !isExpoGo;

// Lazy conditional require — only executed on native development/production builds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Notifications: any = isSupported ? require('expo-notifications') : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Requests permission and registers the Expo push token for this device.
 * Saves the token in the `push_tokens` Supabase table under the given userId.
 * Returns the token string or null if denied / not supported.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!isSupported || !userId || userId === 'preview-user') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission refusée');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const supabase = getSupabase();
    const { error } = await supabase.from('push_tokens').upsert(
      { userId, token, platform: Platform.OS, updatedAt: new Date().toISOString() },
      { onConflict: 'userId' }
    );

    if (error) {
      console.log('[Push] Erreur sauvegarde token:', error.message);
      return null;
    }

    console.log('[Push] Token enregistré:', token);
    return token;
  } catch (error) {
    console.log('[Push] Erreur enregistrement token:', error);
    return null;
  }
}

/**
 * Removes the push token for the given user from Supabase (called on logout).
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!isSupported || !userId || userId === 'preview-user') return;

  try {
    const supabase = getSupabase();
    await supabase.from('push_tokens').delete().eq('userId', userId);
    console.log('[Push] Token supprimé pour:', userId);
  } catch (error) {
    console.log('[Push] Erreur suppression token:', error);
  }
}

/**
 * Sends a push notification to all devices belonging to the given userIds.
 * Fetches tokens from Supabase, then calls the Expo Push API.
 */
export async function sendPushNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!userIds.length) return;

  // Filter out preview/anonymous users
  const realUserIds = userIds.filter(id => id && id !== 'preview-user');
  if (!realUserIds.length) return;

  try {
    const supabase = getSupabase();

    // F5 Mode Ne pas déranger : retirer les users en quiet hours avant le push.
    // Notif in-app DB conservée (créée séparément côté store), seul le push Expo
    // est skippé. Fail-open : si la RPC échoue, on garde tous les destinataires.
    let pushTargets = realUserIds;
    try {
      const { data: eligible, error: rpcErr } = await supabase.rpc(
        'users_not_in_quiet_hours',
        { p_user_ids: realUserIds }
      );
      if (!rpcErr && Array.isArray(eligible)) {
        pushTargets = eligible.map((row: any) =>
          typeof row === 'string' ? row : row.users_not_in_quiet_hours ?? row
        );
      }
    } catch {
      // fail-open
    }
    if (!pushTargets.length) return;

    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .in('userId', pushTargets);

    if (error || !rows?.length) return;

    const tokens = rows.map(r => r.token).filter(Boolean);
    if (!tokens.length) return;

    // Expo push API accepts up to 100 messages per request
    const BATCH = 100;
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const messages = batch.map(to => ({
        to,
        title,
        body,
        sound: 'default' as const,
        priority: 'high' as const,
        data: data ?? {},
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.log('[Push] Erreur API Expo:', response.status);
      } else {
        console.log(`[Push] ${batch.length} notification(s) envoyée(s)`);
      }
    }
  } catch (error) {
    console.log('[Push] Erreur envoi notifications:', error);
  }
}
