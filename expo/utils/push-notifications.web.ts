// Stub web — expo-notifications n'est pas supporté sur web
// Metro utilisera automatiquement ce fichier pour les builds web

export async function registerPushToken(_userId: string): Promise<string | null> {
  return null;
}

export async function unregisterPushToken(_userId: string): Promise<void> {
  // no-op
}

export async function sendPushNotifications(
  _userIds: string[],
  _title: string,
  _body: string,
  _data?: Record<string, unknown>
): Promise<void> {
  // no-op
}
