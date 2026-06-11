import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CreatePostModal, EditingPost } from '../components/CreatePostModal';

// Single-instance composer. Mounting <CreatePostModal /> from multiple screens
// (e.g. SocialScreen + ProfileScreen) created stacking glitches with React
// Native's transparent <Modal>. This context mounts it exactly once at the app
// root; any screen calls useCreatePostModal().open(...) to invoke it.

type OpenOptions = {
  editingPost?: EditingPost | null;
  onPostCreated?: () => void;
};

type CreatePostModalContextValue = {
  open: (options?: OpenOptions) => void;
  close: () => void;
};

const CreatePostModalContext = createContext<CreatePostModalContextValue | null>(null);

export const useCreatePostModal = (): CreatePostModalContextValue => {
  const ctx = useContext(CreatePostModalContext);
  if (!ctx) {
    throw new Error('useCreatePostModal must be used within <CreatePostModalProvider>');
  }
  return ctx;
};

export const CreatePostModalProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);

  // Ref so the callback is never a stale closure across renders.
  const onPostCreatedRef = useRef<(() => void) | undefined>(undefined);

  const open = useCallback((options?: OpenOptions) => {
    setEditingPost(options?.editingPost ?? null);
    onPostCreatedRef.current = options?.onPostCreated;
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setEditingPost(null);
    onPostCreatedRef.current = undefined;
  }, []);

  const handlePostCreated = useCallback(() => {
    onPostCreatedRef.current?.();
    close();
  }, [close]);

  return (
    <CreatePostModalContext.Provider value={{ open, close }}>
      {children}
      <CreatePostModal
        visible={visible}
        onClose={close}
        onPostCreated={handlePostCreated}
        editingPost={editingPost}
      />
    </CreatePostModalContext.Provider>
  );
};
