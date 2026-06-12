import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../config/supabase';

// Notifications shown in-foreground get a banner so the user notices them
// instead of silently appearing only in the bell badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register the device's Expo push token and store it on push_tokens for the
// signed-in user. Idempotent — re-registering the same device on the same
// account is a no-op (UNIQUE(user_id, expo_token)).
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return; // emulators/simulators don't get real tokens

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EAB308',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp.data;
    if (!token) return;

    await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, expo_token: token, platform: Platform.OS },
        { onConflict: 'user_id,expo_token' },
      );
  } catch (err) {
    console.log('[push] register failed:', err);
  }
}
