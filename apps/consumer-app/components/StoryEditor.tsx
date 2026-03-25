/**
 * StoryEditor — full-screen story creation experience.
 *
 * Features
 *   • Colour-wash filter effects (Normal / Warm / Cool / Dark / Fade / Vibrant / Golden)
 *   • Draggable text overlays with colour & size picker
 *   • Draggable emoji-sticker overlays
 *   • Caption input with @mention highlighting
 *   • Long-press any overlay to delete it
 */

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface TextOverlay {
  id: string;
  content: string;
  x: number; // 0–1 (relative to canvas width)
  y: number; // 0–1 (relative to canvas height)
  color: string;
  size: number;
  bold: boolean;
  bg: boolean; // semi-transparent dark pill behind the text
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

export interface StoryEditorData {
  uri: string;
  mediaType: 'image' | 'video';
  caption: string;
  filter: string;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
}

interface Props {
  uri: string;
  mediaType: 'image' | 'video';
  onDone: (data: StoryEditorData) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Canvas is the area where the media lives (takes up most of the screen)
const CANVAS_H = SCREEN_H * 0.78;
const CANVAS_W = SCREEN_W;

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#EAB308', '#EF4444',
  '#3B82F6', '#22C55E', '#F97316', '#EC4899', '#A855F7',
];

const FILTER_OPTIONS = [
  { id: 'none',    label: 'Normal',  overlay: 'transparent' },
  { id: 'warm',    label: 'Warm',    overlay: 'rgba(255,110,50,0.22)' },
  { id: 'cool',    label: 'Cool',    overlay: 'rgba(30,90,255,0.22)' },
  { id: 'dark',    label: 'Dark',    overlay: 'rgba(0,0,0,0.40)' },
  { id: 'fade',    label: 'Fade',    overlay: 'rgba(255,255,255,0.30)' },
  { id: 'vibrant', label: 'Vibrant', overlay: 'rgba(170,0,220,0.20)' },
  { id: 'golden',  label: 'Golden',  overlay: 'rgba(255,190,0,0.25)' },
  { id: 'dusk',    label: 'Dusk',    overlay: 'rgba(120,0,80,0.30)' },
];

export const FILTER_OVERLAY_MAP: Record<string, string> = Object.fromEntries(
  FILTER_OPTIONS.map((f) => [f.id, f.overlay])
);

const STICKER_GRID = [
  ['😍', '🔥', '💯', '✨', '🎉', '🥳', '😎', '💫'],
  ['🌙', '⭐', '🏆', '💎', '👑', '🎶', '❤️', '💜'],
  ['🌊', '🌴', '🏖️', '🌅', '🎵', '🍾', '🥂', '🎤'],
  ['😂', '😅', '🤩', '🥰', '😏', '🤟', '👏', '🙌'],
  ['🦋', '🌸', '🌺', '🎊', '🎆', '🪩', '💃', '🕺'],
  ['🤑', '💸', '🎯', '⚡', '🌈', '🔮', '🫶', '🙏'],
];

type ToolMode = 'none' | 'filter' | 'text' | 'sticker' | 'caption';

// ─── DraggableOverlay ─────────────────────────────────────────────────────────

interface DraggableOverlayProps {
  id: string;
  initX: number; // absolute pixels (not fractions)
  initY: number;
  onRelease: (id: string, x: number, y: number) => void;
  onLongPress: (id: string) => void;
  children: React.ReactNode;
}

const DraggableOverlay = ({
  id,
  initX,
  initY,
  onRelease,
  onLongPress,
  children,
}: DraggableOverlayProps) => {
  const tx = useRef(new Animated.Value(initX)).current;
  const ty = useRef(new Animated.Value(initY)).current;
  const lastX = useRef(initX);
  const lastY = useRef(initY);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMove = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        didMove.current = false;
        longTimer.current = setTimeout(() => {
          longTimer.current = null;
          onLongPress(id);
        }, 600);
      },
      onPanResponderMove: (_, gs) => {
        if (longTimer.current && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4)) {
          clearTimeout(longTimer.current);
          longTimer.current = null;
        }
        didMove.current = true;
        tx.setValue(lastX.current + gs.dx);
        ty.setValue(lastY.current + gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (longTimer.current) {
          clearTimeout(longTimer.current);
          longTimer.current = null;
        }
        const nx = lastX.current + gs.dx;
        const ny = lastY.current + gs.dy;
        lastX.current = nx;
        lastY.current = ny;
        onRelease(id, nx / CANVAS_W, ny / CANVAS_H);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ position: 'absolute', transform: [{ translateX: tx }, { translateY: ty }] }}
    >
      {children}
    </Animated.View>
  );
};

// ─── StoryEditor ──────────────────────────────────────────────────────────────

export const StoryEditor = ({ uri, mediaType, onDone, onCancel }: Props) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [activeFilter, setActiveFilter] = useState('none');
  const [toolMode, setToolMode] = useState<ToolMode>('none');

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(22);
  const [textBold, setTextBold] = useState(false);
  const [textBg, setTextBg] = useState(false);

  // Caption state
  const [caption, setCaption] = useState('');

  const uid = useCallback(() => `${Date.now()}-${Math.random()}`, []);

  // ── Helpers ──

  const dismissTool = () => setToolMode('none');

  // ── Text overlay actions ──

  const addTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: uid(),
      content: 'Tap to edit',
      x: 0.5 - 60 / CANVAS_W, // approx-center
      y: 0.4,
      color: selectedColor,
      size: textSize,
      bold: textBold,
      bg: textBg,
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setEditingTextId(newOverlay.id);
    setDraftText('Tap to edit');
  };

  const commitTextEdit = () => {
    if (!editingTextId) return;
    setTextOverlays((prev) =>
      prev.map((t) =>
        t.id === editingTextId
          ? { ...t, content: draftText, color: selectedColor, size: textSize, bold: textBold, bg: textBg }
          : t
      )
    );
    setEditingTextId(null);
    setDraftText('');
  };

  const handleTextOverlayTap = (overlay: TextOverlay) => {
    setEditingTextId(overlay.id);
    setDraftText(overlay.content);
    setSelectedColor(overlay.color);
    setTextSize(overlay.size);
    setTextBold(overlay.bold);
    setTextBg(overlay.bg);
  };

  const removeOverlay = (id: string) => {
    Alert.alert('Remove', 'Delete this element?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setTextOverlays((prev) => prev.filter((t) => t.id !== id));
          setStickerOverlays((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  };

  const updateOverlayPosition = (id: string, x: number, y: number) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
    setStickerOverlays((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  // ── Sticker actions ──

  const addSticker = (emoji: string) => {
    setStickerOverlays((prev) => [
      ...prev,
      { id: uid(), emoji, x: 0.4, y: 0.45, size: 48 },
    ]);
    dismissTool();
  };

  // ── Caption / mention helpers ──

  // Highlight @mentions in the caption preview
  const renderCaptionWithMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <Text key={i} style={styles.mention}>{part}</Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  // ── Done ──

  const handleNext = () => {
    // If text is being edited, commit it first
    if (editingTextId) commitTextEdit();
    setToolMode('caption');
  };

  const handlePost = () => {
    onDone({
      uri,
      mediaType,
      caption: caption.trim(),
      filter: activeFilter,
      textOverlays,
      stickerOverlays,
    });
  };

  const filterOverlayColor = FILTER_OVERLAY_MAP[activeFilter] || 'transparent';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.root}>

        {/* ── Canvas ──────────────────────────────── */}
        <View style={styles.canvas} pointerEvents={editingTextId ? 'none' : 'box-none'}>
          {/* Background media */}
          {mediaType === 'video' ? (
            <Video
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          ) : (
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}

          {/* Filter overlay */}
          {filterOverlayColor !== 'transparent' && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: filterOverlayColor }]}
              pointerEvents="none"
            />
          )}

          {/* Text overlays */}
          {textOverlays.map((t) => (
            <DraggableOverlay
              key={t.id}
              id={t.id}
              initX={t.x * CANVAS_W}
              initY={t.y * CANVAS_H}
              onRelease={updateOverlayPosition}
              onLongPress={removeOverlay}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleTextOverlayTap(t)}
              >
                <View style={t.bg ? [styles.textBubble] : undefined}>
                  <Text
                    style={{
                      color: t.color,
                      fontSize: t.size,
                      fontWeight: t.bold ? 'bold' : '600',
                      textShadowColor: 'rgba(0,0,0,0.6)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    {t.content}
                  </Text>
                </View>
              </TouchableOpacity>
            </DraggableOverlay>
          ))}

          {/* Sticker overlays */}
          {stickerOverlays.map((s) => (
            <DraggableOverlay
              key={s.id}
              id={s.id}
              initX={s.x * CANVAS_W}
              initY={s.y * CANVAS_H}
              onRelease={updateOverlayPosition}
              onLongPress={removeOverlay}
            >
              <Text style={{ fontSize: s.size }}>{s.emoji}</Text>
            </DraggableOverlay>
          ))}
        </View>

        {/* ── Header ──────────────────────────────── */}
        <View style={styles.header} pointerEvents="box-none">
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>

        {/* ── Inline text editor ───────────────────── */}
        {editingTextId && (
          <KeyboardAvoidingView
            style={styles.textEditorOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Color + style row */}
            <View style={styles.textStyleRow}>
              <TouchableOpacity
                style={[styles.styleBtn, textBold && styles.styleBtnActive]}
                onPress={() => setTextBold((b) => !b)}
              >
                <Text style={styles.styleBtnLabel}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.styleBtn, textBg && styles.styleBtnActive]}
                onPress={() => setTextBg((b) => !b)}
              >
                <Text style={styles.styleBtnLabel}>A▪</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTextSize((s) => Math.min(s + 4, 48))}>
                <Text style={styles.sizeBtn}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTextSize((s) => Math.max(s - 4, 14))}>
                <Text style={styles.sizeBtn}>A-</Text>
              </TouchableOpacity>
            </View>

            {/* Colour swatches */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.colorRow}
              contentContainerStyle={styles.colorRowContent}
            >
              {TEXT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    c === selectedColor && styles.colorSwatchSelected,
                  ]}
                />
              ))}
            </ScrollView>

            {/* Text input */}
            <View style={styles.textInputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: selectedColor,
                    fontSize: Math.min(textSize, 24),
                    fontWeight: textBold ? 'bold' : '600',
                  },
                ]}
                value={draftText}
                onChangeText={setDraftText}
                autoFocus
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={commitTextEdit}
                placeholder="Type something..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              <TouchableOpacity onPress={commitTextEdit} style={styles.textDoneBtn}>
                <Text style={styles.textDoneBtnLabel}>Done</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── Bottom toolbar ───────────────────────── */}
        {!editingTextId && (
          <View style={styles.toolbar}>
            {/* Filter strip */}
            {toolMode === 'filter' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterStrip}
                contentContainerStyle={styles.filterStripContent}
              >
                {FILTER_OPTIONS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => { setActiveFilter(f.id); dismissTool(); }}
                    style={styles.filterThumb}
                  >
                    <View
                      style={[
                        styles.filterPreview,
                        f.id === activeFilter && styles.filterPreviewActive,
                      ]}
                    >
                      {/* Tiny media thumbnail */}
                      <Image
                        source={{ uri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      {f.overlay !== 'transparent' && (
                        <View
                          style={[StyleSheet.absoluteFill, { backgroundColor: f.overlay }]}
                        />
                      )}
                    </View>
                    <Text style={styles.filterLabel}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Sticker picker */}
            {toolMode === 'sticker' && (
              <View style={styles.stickerPanel}>
                {STICKER_GRID.map((row, ri) => (
                  <View key={ri} style={styles.stickerRow}>
                    {row.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => addSticker(emoji)}
                        style={styles.stickerBtn}
                      >
                        <Text style={styles.stickerEmoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Tool buttons */}
            <View style={styles.toolRow}>
              <ToolBtn
                icon="🎨"
                label="Filter"
                active={toolMode === 'filter'}
                onPress={() => setToolMode(toolMode === 'filter' ? 'none' : 'filter')}
              />
              <ToolBtn
                icon="T"
                label="Text"
                active={toolMode === 'text'}
                onPress={() => { setToolMode('none'); addTextOverlay(); }}
                textIcon
              />
              <ToolBtn
                icon="😊"
                label="Sticker"
                active={toolMode === 'sticker'}
                onPress={() => setToolMode(toolMode === 'sticker' ? 'none' : 'sticker')}
              />
              {(toolMode === 'filter' || toolMode === 'sticker') && (
                <ToolBtn icon="✕" label="Close" onPress={dismissTool} />
              )}
            </View>
          </View>
        )}

        {/* ── Caption Modal ────────────────────────── */}
        <Modal
          visible={toolMode === 'caption'}
          transparent
          animationType="slide"
          onRequestClose={() => setToolMode('none')}
        >
          <KeyboardAvoidingView
            style={styles.captionOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.captionSheet}>
              <View style={styles.captionHandle} />
              <Text style={styles.captionTitle}>Add a Caption</Text>

              <TextInput
                style={styles.captionInput}
                placeholder="What's your vibe? (optional — use @name to mention)"
                placeholderTextColor={colors.textSecondary}
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                multiline
              />

              {/* @mention preview */}
              {caption.includes('@') && (
                <Text style={styles.captionPreview} numberOfLines={2}>
                  {renderCaptionWithMentions(caption)}
                </Text>
              )}

              <View style={styles.captionBtns}>
                <TouchableOpacity
                  style={styles.captionBackBtn}
                  onPress={() => setToolMode('none')}
                >
                  <Text style={styles.captionBackText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captionPostBtn} onPress={handlePost}>
                  <Text style={styles.captionPostText}>Post Story</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
};

// ─── ToolBtn helper ───────────────────────────────────────────────────────────

const ToolBtn = ({
  icon,
  label,
  active,
  onPress,
  textIcon,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
  textIcon?: boolean;
}) => (
  <TouchableOpacity style={toolBtnStyles.btn} onPress={onPress}>
    <View style={[toolBtnStyles.iconWrap, active && toolBtnStyles.iconActive]}>
      <Text style={textIcon ? toolBtnStyles.textIconLabel : toolBtnStyles.iconLabel}>
        {icon}
      </Text>
    </View>
    <Text style={toolBtnStyles.btnLabel}>{label}</Text>
  </TouchableOpacity>
);

const toolBtnStyles = StyleSheet.create({
  btn: { alignItems: 'center', gap: 4, minWidth: 60 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: 'rgba(234,179,8,0.35)' },
  iconLabel: { fontSize: 22, fontFamily: '' },
  textIconLabel: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  btnLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#000',
    },

    // Canvas
    canvas: {
      width: CANVAS_W,
      height: CANVAS_H,
      overflow: 'hidden',
      backgroundColor: '#111',
    },

    // Header
    header: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 52 : 28,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      zIndex: 20,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
    nextBtn: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 22,
      backgroundColor: colors.primary,
    },
    nextBtnText: { fontSize: 14, fontWeight: 'bold', color: '#000' },

    // Text editing
    textEditorOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      paddingTop: 12,
      zIndex: 30,
    },
    textStyleRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: 8,
      alignItems: 'center',
    },
    styleBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    styleBtnActive: { backgroundColor: colors.primary },
    styleBtnLabel: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    sizeBtn: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 8,
    },
    colorRow: { maxHeight: 44 },
    colorRowContent: {
      paddingHorizontal: 16,
      gap: 10,
      alignItems: 'center',
    },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: '#fff',
      transform: [{ scale: 1.2 }],
    },
    textInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
    },
    textInput: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    textDoneBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    textDoneBtnLabel: { fontWeight: 'bold', color: '#000', fontSize: 14 },

    textBubble: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    // Toolbar
    toolbar: {
      flex: 1,
      backgroundColor: '#111',
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    },
    toolRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      paddingTop: 14,
      paddingHorizontal: 16,
    },

    // Filters
    filterStrip: { maxHeight: 110 },
    filterStripContent: {
      paddingHorizontal: 16,
      gap: 10,
      paddingTop: 10,
      alignItems: 'flex-start',
    },
    filterThumb: { alignItems: 'center', gap: 4 },
    filterPreview: {
      width: 62,
      height: 80,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    filterPreviewActive: { borderColor: colors.primary },
    filterLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

    // Stickers
    stickerPanel: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 16,
      marginHorizontal: 12,
      marginTop: 10,
      padding: 8,
      gap: 2,
    },
    stickerRow: { flexDirection: 'row', justifyContent: 'space-around' },
    stickerBtn: { padding: 6 },
    stickerEmoji: { fontSize: 28, fontFamily: '' },

    // Caption modal
    captionOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    captionSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      gap: 14,
    },
    captionHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 4,
    },
    captionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    captionInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      minHeight: 90,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
    },
    captionPreview: {
      fontSize: 13,
      color: colors.textSecondary,
      paddingHorizontal: 4,
    },
    mention: {
      color: colors.primary,
      fontWeight: '700',
    },
    captionBtns: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    captionBackBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    captionBackText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    captionPostBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    captionPostText: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#000',
    },
  });
