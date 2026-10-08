import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { pickMedia } from '../lib/mediaCapture';
import { STORY_ALLOWED_MIME, STORY_MAX_BYTES, uploadMedia } from '../lib/uploadFile';
import { StoryEditor, StoryEditorData } from '../components/StoryEditor';

// Single-instance story creator. Both Home's Stories rail ("My Vibe" tile) and
// Profile's "New Vibe" button funnel through this provider, so the picker →
// editor → upload pipeline lives in one place. Callers pass an optional
// onCreated hook to refresh their local list once a story is live.

type OpenOptions = {
  onCreated?: () => void;
};

type StoryCreatorContextValue = {
  open: (options?: OpenOptions) => Promise<void>;
  // Subscribe to upload-complete events. Returns an unsubscribe fn.
  // StorySection uses this so any new vibe — created from Home, Profile,
  // or anywhere else — refreshes the rail without relying on focus
  // changes (bottom-tab useFocusEffect can miss).
  subscribeUploaded: (cb: () => void) => () => void;
};

const StoryCreatorContext = createContext<StoryCreatorContextValue | null>(null);

export const useStoryCreator = (): StoryCreatorContextValue => {
  const ctx = useContext(StoryCreatorContext);
  if (!ctx) {
    throw new Error('useStoryCreator must be used within <StoryCreatorProvider>');
  }
  return ctx;
};

type EditorData = {
  uri: string;
  mediaType: 'image' | 'video';
  mimeType?: string;
};

export const StoryCreatorProvider = ({ children }: { children: ReactNode }) => {
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const onCreatedRef = useRef<(() => void) | undefined>(undefined);
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const subscribeUploaded = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => { subscribersRef.current.delete(cb); };
  }, []);

  const open = useCallback(async (options?: OpenOptions) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Sign In Required', 'Please sign in to post a story.');
      return;
    }

    // Stories are the most time-sensitive surface in the app — a vibe posted
    // from the venue is the product. Capture is offered first, and video is
    // allowed here (unlike posts, which hold a single image).
    const asset = await pickMedia({
      title: 'Share a vibe',
      mediaTypes: ['images', 'videos'],
      allowsEditing: false, // the story editor handles cropping
      quality: 0.9,
      videoMaxDuration: 60,
    });
    if (!asset) return;

    onCreatedRef.current = options?.onCreated;
    setEditorData({ uri: asset.uri, mediaType: asset.mediaType, mimeType: asset.mimeType });
  }, []);

  const handleCancel = useCallback(() => {
    setEditorData(null);
    onCreatedRef.current = undefined;
  }, []);

  const handleDone = useCallback(async (data: StoryEditorData) => {
    const mimeType = editorData?.mimeType;
    const callback = onCreatedRef.current;
    setEditorData(null);
    onCreatedRef.current = undefined;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated — please sign in again.');

      const user = session.user;
      const { uri, mediaType, caption, filter, textOverlays, stickerOverlays } = data;

      const overlaysJson = [
        ...textOverlays.map((t) => ({ type: 'text', ...t })),
        ...stickerOverlays.map((s) => ({ type: 'sticker', ...s })),
      ];

      // Streams the file from disk — see lib/uploadFile.ts for why a vibe must
      // not be read into memory first. Its thrown messages are user-facing.
      const { publicUrl } = await uploadMedia({
        bucket: 'stories',
        pathPrefix: `${user.id}/${Date.now()}`,
        fileUri: uri,
        mediaType,
        pickerMimeType: mimeType,
        maxBytes: STORY_MAX_BYTES,
        allowedMimeTypes: STORY_ALLOWED_MIME,
      });

      const { error: insertError } = await supabase.from('stories').insert({
        user_id: user.id,
        image_url: publicUrl,
        media_type: mediaType,
        caption: caption || null,
        filter_effect: filter,
        overlays: overlaysJson,
      });
      if (insertError) throw new Error(`Story save failed: ${insertError.message}`);

      Alert.alert('Posted!', 'Your story is live for 24 hours.');
      callback?.();
      // Broadcast so any subscribed list (e.g. Home Stories rail) refreshes
      // regardless of which screen triggered the upload.
      subscribersRef.current.forEach((cb) => cb());
    } catch (error: any) {
      console.error('[Story upload] caught error:', error);
      Alert.alert('Upload Failed', error.message || 'An unexpected error occurred.');
    }
  }, [editorData]);

  return (
    <StoryCreatorContext.Provider value={{ open, subscribeUploaded }}>
      {children}
      {editorData && (
        <StoryEditor
          uri={editorData.uri}
          mediaType={editorData.mediaType}
          onDone={handleDone}
          onCancel={handleCancel}
        />
      )}
    </StoryCreatorContext.Provider>
  );
};
