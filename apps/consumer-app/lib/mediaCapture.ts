/**
 * Picking media, from the camera or the library.
 *
 * Why this is shared: the choice of "which permission does this source need"
 * is easy to get subtly wrong, and getting it wrong is invisible until a real
 * device refuses. Keeping it in one place means the post composer and the story
 * creator cannot drift apart.
 *
 * The recovery path matters as much as the request. Once someone taps "Don't
 * Allow", iOS will never prompt again — the app simply stops working with no
 * explanation. The previous code said "Please grant permission to access your
 * photos" and left the user at a dead end. Every denial here offers Settings.
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export type MediaKind = 'images' | 'videos';

export interface PickedAsset {
  uri: string;
  mediaType: 'image' | 'video';
  mimeType?: string;
}

interface PickOptions {
  /** What the caller accepts. Include 'videos' only where video is supported. */
  mediaTypes: MediaKind[];
  quality?: number;
  videoMaxDuration?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
  /** Title on the source chooser. */
  title?: string;
}

type Source = 'camera' | 'library';

const askSource = (title: string, withVideo: boolean): Promise<Source | null> =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        {
          text: withVideo ? 'Take photo or video' : 'Take photo',
          onPress: () => resolve('camera'),
        },
        { text: 'Choose from library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      // iOS alerts are modal and cannot be dismissed by tapping away, so this
      // only fires on Android — but without it an Android back-press leaves the
      // promise pending forever and the button appears dead.
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });

const denied = (source: Source) => {
  const what = source === 'camera' ? 'Camera access' : 'Photo access';
  Alert.alert(
    `${what} is off`,
    `Gidi Connect needs ${source === 'camera' ? 'your camera' : 'your photos'} for this. You can turn it on in Settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
    ],
  );
};

/**
 * Prompts for a source, requests only the permission that source needs, and
 * returns the chosen asset — or null if the user backed out at any point.
 * Callers treat null as "nothing happened" and should not show an error.
 */
export async function pickMedia(options: PickOptions): Promise<PickedAsset | null> {
  const { mediaTypes, quality = 0.8, videoMaxDuration, allowsEditing, aspect } = options;
  const withVideo = mediaTypes.includes('videos');

  const source = await askSource(options.title ?? 'Add a photo', withVideo);
  if (!source) return null;

  try {
    // Only ask for what this source actually uses. Requesting camera access to
    // open the photo library is what makes permission prompts feel arbitrary.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      denied(source);
      return null;
    }

    // In-app crop stays iOS-only. On some Android builds (Samsung especially)
    // the system crop UI ships without a visible confirm button, stranding the
    // user mid-flow with no way out.
    const editing = Platform.OS === 'ios' && allowsEditing
      ? { allowsEditing: true, ...(aspect ? { aspect } : {}) }
      : {};

    const config = {
      mediaTypes,
      quality,
      ...(videoMaxDuration ? { videoMaxDuration } : {}),
      ...editing,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(config)
        : await ImagePicker.launchImageLibraryAsync(config);

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      mediaType: asset.type === 'video' ? 'video' : 'image',
      mimeType: asset.mimeType ?? undefined,
    };
  } catch (err) {
    console.warn(`[mediaCapture] ${source} failed:`, err);
    Alert.alert(
      source === 'camera' ? 'Could not open the camera' : 'Could not open your photos',
      // The simulator has no camera at all, which is the usual cause in dev.
      'Something went wrong. Please try again.',
    );
    return null;
  }
}
