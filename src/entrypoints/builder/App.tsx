import { DeleteOutlined, DownloadOutlined, InboxOutlined, ReloadOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Collapse, ColorPicker, Input, Radio, Row, Select, Slider, Space, Typography, Upload, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';

const { TextArea } = Input;
const { Title } = Typography;
const { Panel } = Collapse;
const { Dragger } = Upload;

// Types
interface IndividualEmoji {
  char: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
  isColorTransparent: boolean;
}

interface Position {
  char: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity?: number;
}

interface BackgroundImage {
  url: string;
  objectFit: 'fit' | 'fill' | 'cover';
  scale: number;
  x: number;
  y: number;
  rotation: number;
}

interface AppState {
  // Text and layout
  text: string;
  aspectRatio: string;
  layoutMode: 'auto' | 'manual';
  emojiCount: number;

  // Background
  backgroundColor: string;
  isTransparent: boolean;
  backgroundImage: BackgroundImage | null;

  // Text/Emoji styling
  textOpacity: number;
  textColor: string;
  isTextColorTransparent: boolean;
  emojiStyle: 'colorful' | 'blackandwhite' | 'randomopacity';

  // Font
  selectedFont: string;
  customFont: string;
  customFontName: string;
  showCustomFont: boolean;
  uploadedFontUrl: string;
  systemFonts: Array<{ value: string; label: string }>;

  // Layout
  minDistance: number;

  // Export
  exportFormat: 'png' | 'jpg' | 'svg' | 'webp';

  // Generated positions
  positions: Position[];
  individualEmojis: IndividualEmoji[];
  isGenerating: boolean;

  // Interactive adjustment modes
  adjustmentMode: 'none' | 'background' | 'emoji';
  selectedEmojiIndex: number;
  isDragging: boolean;
  dragStartPosition: { x: number; y: number } | null;
}

interface AppActions {
  setText: (text: string) => void;
  setAspectRatio: (ratio: string) => void;
  setLayoutMode: (mode: 'auto' | 'manual') => void;
  setEmojiCount: (count: number) => void;
  setBackgroundColor: (color: string) => void;
  setIsTransparent: (transparent: boolean) => void;
  setBackgroundImage: (image: BackgroundImage | null) => void;
  setTextOpacity: (opacity: number) => void;
  setTextColor: (color: string) => void;
  setIsTextColorTransparent: (transparent: boolean) => void;
  setEmojiStyle: (style: 'colorful' | 'blackandwhite' | 'randomopacity') => void;
  setSelectedFont: (font: string) => void;
  setCustomFont: (font: string) => void;
  setCustomFontName: (name: string) => void;
  setShowCustomFont: (show: boolean) => void;
  setUploadedFontUrl: (url: string) => void;
  setSystemFonts: (fonts: Array<{ value: string; label: string }>) => void;
  setMinDistance: (distance: number) => void;
  setExportFormat: (format: 'png' | 'jpg' | 'svg' | 'webp') => void;
  setPositions: (positions: Position[]) => void;
  setIndividualEmojis: (emojis: IndividualEmoji[]) => void;
  updateIndividualEmoji: (index: number, property: keyof IndividualEmoji, value: any) => void;
  setIsGenerating: (generating: boolean) => void;
  clearUploadedFont: () => void;
  updateBackgroundImage: (property: keyof BackgroundImage, value: any) => void;
  setAdjustmentMode: (mode: 'none' | 'background' | 'emoji') => void;
  setSelectedEmojiIndex: (index: number) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStartPosition: (position: { x: number; y: number } | null) => void;
}

// Zustand store
const useStore = create<AppState & AppActions>((set, get) => ({
  // Initial state
  text: 'ム',
  aspectRatio: '1:1',
  layoutMode: 'auto',
  emojiCount: 1,
  backgroundColor: '#ffffff',
  isTransparent: false,
  backgroundImage: null,
  textOpacity: 100,
  textColor: '#000000',
  isTextColorTransparent: false,
  emojiStyle: 'colorful',
  selectedFont: 'Arial',
  customFont: '',
  customFontName: '',
  showCustomFont: false,
  uploadedFontUrl: '',
  systemFonts: [],
  minDistance: 8,
  exportFormat: 'png',
  positions: [],
  individualEmojis: [],
  isGenerating: false,
  adjustmentMode: 'none',
  selectedEmojiIndex: -1,
  isDragging: false,
  dragStartPosition: null,

  // Actions
  setText: (text) => set({ text }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setEmojiCount: (emojiCount) => set({ emojiCount }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setIsTransparent: (isTransparent) => set({ isTransparent }),
  setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
  setTextOpacity: (textOpacity) => set({ textOpacity }),
  setTextColor: (textColor) => set({ textColor }),
  setIsTextColorTransparent: (isTextColorTransparent) => set({ isTextColorTransparent }),
  setEmojiStyle: (emojiStyle) => set({ emojiStyle }),
  setSelectedFont: (selectedFont) => set({ selectedFont }),
  setCustomFont: (customFont) => set({ customFont }),
  setCustomFontName: (customFontName) => set({ customFontName }),
  setShowCustomFont: (showCustomFont) => set({ showCustomFont }),
  setUploadedFontUrl: (uploadedFontUrl) => set({ uploadedFontUrl }),
  setSystemFonts: (systemFonts) => set({ systemFonts }),
  setMinDistance: (minDistance) => set({ minDistance }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setPositions: (positions) => set({ positions }),
  setIndividualEmojis: (individualEmojis) => set({ individualEmojis }),
  updateIndividualEmoji: (index, property, value) => {
    const state = get();
    const updatedEmojis = state.individualEmojis.map((emoji, i) => (i === index ? { ...emoji, [property]: value } : emoji));
    set({ individualEmojis: updatedEmojis });
  },
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  clearUploadedFont: () => {
    const state = get();
    if (state.uploadedFontUrl) {
      URL.revokeObjectURL(state.uploadedFontUrl);
    }
    set({
      uploadedFontUrl: '',
      customFont: '',
      customFontName: '',
      selectedFont: state.selectedFont === 'custom' ? 'Arial' : state.selectedFont,
      showCustomFont: false,
    });
  },
  updateBackgroundImage: (property, value) => {
    const state = get();
    if (state.backgroundImage) {
      set({
        backgroundImage: {
          ...state.backgroundImage,
          [property]: value,
        },
      });
    }
  },
  setAdjustmentMode: (adjustmentMode) => set({ adjustmentMode }),
  setSelectedEmojiIndex: (selectedEmojiIndex) => set({ selectedEmojiIndex }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setDragStartPosition: (dragStartPosition) => set({ dragStartPosition }),
}));

const ThumbnailGenerator: React.FC = () => {
  const store = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Canvas mouse interaction handlers
  const getCanvasCoordinates = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleCanvasMouseDown = useCallback(
    (event: MouseEvent) => {
      if (store.adjustmentMode === 'none') return;

      const coords = getCanvasCoordinates(event);
      store.setIsDragging(true);
      store.setDragStartPosition(coords);

      if (store.adjustmentMode === 'emoji' && store.layoutMode === 'manual') {
        // Find closest emoji to click position
        let closestIndex = -1;
        let closestDistance = Infinity;

        store.individualEmojis.forEach((emoji, index) => {
          const distance = Math.sqrt(Math.pow(coords.x - emoji.x, 2) + Math.pow(coords.y - emoji.y, 2));
          if (distance < closestDistance && distance < 100) {
            // 100px click radius
            closestDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== -1) {
          store.setSelectedEmojiIndex(closestIndex);
        }
      }
    },
    [store, getCanvasCoordinates],
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!store.isDragging || !store.dragStartPosition) return;

      const coords = getCanvasCoordinates(event);
      const deltaX = coords.x - store.dragStartPosition.x;
      const deltaY = coords.y - store.dragStartPosition.y;

      if (store.adjustmentMode === 'background' && store.backgroundImage) {
        store.updateBackgroundImage('x', store.backgroundImage.x + deltaX);
        store.updateBackgroundImage('y', store.backgroundImage.y + deltaY);
        store.setDragStartPosition(coords);
      } else if (store.adjustmentMode === 'emoji' && store.layoutMode === 'manual' && store.selectedEmojiIndex >= 0) {
        const emoji = store.individualEmojis[store.selectedEmojiIndex];
        if (emoji) {
          store.updateIndividualEmoji(store.selectedEmojiIndex, 'x', emoji.x + deltaX);
          store.updateIndividualEmoji(store.selectedEmojiIndex, 'y', emoji.y + deltaY);
          store.setDragStartPosition(coords);
        }
      }
    },
    [store, getCanvasCoordinates],
  );

  const handleCanvasMouseUp = useCallback(() => {
    store.setIsDragging(false);
    store.setDragStartPosition(null);
  }, [store]);

  const handleCanvasWheel = useCallback(
    (event: WheelEvent) => {
      if (store.adjustmentMode === 'none') return;

      event.preventDefault();
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;

      if (store.adjustmentMode === 'background' && store.backgroundImage) {
        const newScale = Math.max(0.1, Math.min(3, store.backgroundImage.scale * scaleFactor));
        store.updateBackgroundImage('scale', newScale);
      } else if (store.adjustmentMode === 'emoji' && store.layoutMode === 'manual' && store.selectedEmojiIndex >= 0) {
        const emoji = store.individualEmojis[store.selectedEmojiIndex];
        if (emoji) {
          const newSize = Math.max(10, Math.min(1000, emoji.size * scaleFactor));
          store.updateIndividualEmoji(store.selectedEmojiIndex, 'size', newSize);
        }
      }
    },
    [store],
  );

  const aspectRatios = useMemo(
    () => [
      { value: '1:1', label: '1:1 (Square)' },
      { value: '16:9', label: '16:9 (Widescreen)' },
      { value: '9:16', label: '9:16 (Vertical)' },
      { value: '4:3', label: '4:3 (Standard)' },
      { value: '3:4', label: '3:4 (Portrait)' },
      { value: '2:1', label: '2:1 (Banner)' },
      { value: '1:2', label: '1:2 (Tall)' },
      { value: '3:2', label: '3:2 (Photo)' },
      { value: '2:3', label: '2:3 (Poster)' },
    ],
    [],
  );

  const fontOptions = useMemo(
    () => [
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'Times New Roman', label: 'Times New Roman' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Verdana', label: 'Verdana' },
      { value: 'Courier New', label: 'Courier New' },
      { value: 'Impact', label: 'Impact' },
      { value: 'Comic Sans MS', label: 'Comic Sans MS' },
      { value: 'Trebuchet MS', label: 'Trebuchet MS' },
      { value: 'Tahoma', label: 'Tahoma' },
      { value: 'Palatino', label: 'Palatino' },
      { value: 'Lucida Console', label: 'Lucida Console' },
      { value: 'custom', label: '🎨 Add Custom Font' },
    ],
    [],
  );

  const commonSystemFonts = useMemo(
    () => [
      'Arial Black',
      'Calibri',
      'Cambria',
      'Candara',
      'Century Gothic',
      'Consolas',
      'Franklin Gothic Medium',
      'Futura',
      'Garamond',
      'Gill Sans',
      'Helvetica Neue',
      'Lucida Grande',
      'Lucida Sans Unicode',
      'Microsoft Sans Serif',
      'Monaco',
      'Optima',
      'Segoe UI',
      'System',
      '-apple-system',
      'BlinkMacSystemFont',
      'San Francisco',
      'Roboto',
      'Open Sans',
      'Montserrat',
      'Lato',
      'Source Sans Pro',
      'Ubuntu',
      'Nunito',
      'Raleway',
      'Poppins',
      'Inter',
      'Work Sans',
      'Playfair Display',
      'Merriweather',
      'Oswald',
      'Source Serif Pro',
      'Crimson Text',
      'PT Sans',
      'PT Serif',
      'Fira Sans',
      'IBM Plex Sans',
      'Avenir',
      'Proxima Nova',
      'Myriad Pro',
    ],
    [],
  );

  const exportFormats = useMemo(
    () => [
      { value: 'png', label: 'PNG' },
      { value: 'jpg', label: 'JPG' },
      { value: 'webp', label: 'WebP' },
      { value: 'svg', label: 'SVG' },
    ],
    [],
  );

  const objectFitOptions = useMemo(
    () => [
      { value: 'fit', label: 'Fit (contain)' },
      { value: 'fill', label: 'Fill (stretch)' },
      { value: 'cover', label: 'Cover (crop)' },
    ],
    [],
  );

  // Function to detect available system fonts
  const detectSystemFonts = useCallback(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const defaultWidth: { [key: string]: number } = {};
    const defaultHeight: { [key: string]: number } = {};

    for (const baseFont of baseFonts) {
      context.font = `${testSize} ${baseFont}`;
      const metrics = context.measureText(testString);
      defaultWidth[baseFont] = metrics.width;
      defaultHeight[baseFont] = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    }

    const availableFonts: Array<{ value: string; label: string }> = [];

    for (const font of commonSystemFonts) {
      let available = false;

      for (const baseFont of baseFonts) {
        context.font = `${testSize} ${font}, ${baseFont}`;
        const metrics = context.measureText(testString);
        const width = metrics.width;
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        if (Math.abs(width - defaultWidth[baseFont]) > 1 || Math.abs(height - defaultHeight[baseFont]) > 1) {
          available = true;
          break;
        }
      }

      if (available) {
        availableFonts.push({ value: font, label: font });
      }
    }

    return availableFonts.sort((a, b) => a.label.localeCompare(b.label));
  }, [commonSystemFonts]);

  const getCanvasDimensions = useCallback((ratio: string) => {
    const baseWidth = 800;
    const [w, h] = ratio.split(':').map(Number);
    const width = baseWidth;
    const height = (baseWidth * h) / w;
    return { width, height };
  }, []);

  // Initialize individual emojis
  const initializeIndividualEmojis = useCallback(() => {
    // const characters = [...store.text.trim()].filter(char => char !== ' ');
    const characters = store.text
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '');
    if (characters.length === 0) return [];

    const { width, height } = getCanvasDimensions(store.aspectRatio);
    const emojis: IndividualEmoji[] = [];

    for (let i = 0; i < store.emojiCount; i++) {
      const char = characters[i % characters.length];

      let x, y;
      if (store.emojiCount === 1) {
        x = width / 2;
        y = height / 2;
      } else {
        const cols = Math.ceil(Math.sqrt(store.emojiCount));
        const rows = Math.ceil(store.emojiCount / cols);
        const cellWidth = width / cols;
        const cellHeight = height / rows;

        const row = Math.floor(i / cols);
        const col = i % cols;

        x = col * cellWidth + cellWidth / 2;
        y = row * cellHeight + cellHeight / 2;
      }

      emojis.push({
        char,
        x,
        y,
        size: 400,
        rotation: 0,
        opacity: 1,
        color: store.textColor,
        isColorTransparent: store.isTextColorTransparent,
      });
    }

    return emojis;
  }, [store.text, store.emojiCount, store.aspectRatio, store.textColor, store.isTextColorTransparent]);

  // Generate diagonal fill positions
  const generateDiagonalFillPositions = useCallback(
    (characters: string[], canvasWidth: number, canvasHeight: number, maxLines: number = 5): Position[] => {
      if (characters.length === 0) return [];

      const positions: Position[] = [];
      let charIndex = 0;

      const totalSpan = canvasWidth + canvasHeight;
      const step = totalSpan / (maxLines + 1);

      for (let line = 1; line <= maxLines; line++) {
        const offset = step * line;

        let startX = Math.max(0, offset - canvasHeight);
        let startY = Math.max(0, canvasHeight - offset);

        let x = startX;
        let y = startY;

        const spacing = 80;

        while (x < canvasWidth && y < canvasHeight) {
          const char = characters[charIndex % characters.length];
          positions.push({
            char,
            x,
            y,
            size: Math.random() * 40 + 30,
            rotation: Math.random() * 360,
            opacity: store.emojiStyle === 'randomopacity' ? Math.random() * 0.8 + 0.2 : 1,
          });

          x += spacing;
          y += spacing;
          charIndex++;
        }
      }

      return positions;
    },
    [store.emojiStyle],
  );

  // Draw canvas function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasDimensions(store.aspectRatio);

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    if (!store.isTransparent) {
      ctx.fillStyle = store.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw background image
    if (store.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.save();

        const { scale, x, y, rotation, objectFit } = store.backgroundImage!;
        const centerX = width / 2 + x;
        const centerY = height / 2 + y;

        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);

        let drawWidth, drawHeight;
        let drawX, drawY;

        switch (objectFit) {
          case 'fill':
            drawWidth = width * scale;
            drawHeight = height * scale;
            break;
          case 'cover':
            const aspectCanvas = width / height;
            const aspectImage = img.width / img.height;
            if (aspectImage > aspectCanvas) {
              drawHeight = height * scale;
              drawWidth = drawHeight * aspectImage;
            } else {
              drawWidth = width * scale;
              drawHeight = drawWidth / aspectImage;
            }
            break;
          case 'fit':
          default:
            const aspectCanvasFit = width / height;
            const aspectImageFit = img.width / img.height;
            if (aspectImageFit > aspectCanvasFit) {
              drawWidth = width * scale;
              drawHeight = drawWidth / aspectImageFit;
            } else {
              drawHeight = height * scale;
              drawWidth = drawHeight * aspectImageFit;
            }
            break;
        }

        drawX = -drawWidth / 2;
        drawY = -drawHeight / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // Redraw text/emojis after background image loads
        drawTextEmojis();
      };
      img.src = store.backgroundImage.url;
    } else {
      drawTextEmojis();
    }

    function drawTextEmojis() {
      const positionsToUse = store.layoutMode === 'manual' ? store.individualEmojis : store.positions;

      positionsToUse.forEach((item) => {
        const { char, x, y, size, rotation } = item;
        let opacity = 1;
        let color = store.textColor;
        let isColorTransparent = store.isTextColorTransparent;

        if (store.layoutMode === 'manual') {
          const emoji = item as IndividualEmoji;
          opacity = emoji.opacity;
          color = emoji.color;
          isColorTransparent = emoji.isColorTransparent;
        } else {
          const pos = item as Position;
          opacity = (store.textOpacity / 100) * (pos.opacity || 1);
        }
        if (!ctx) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);

        const currentFont = store.selectedFont === 'custom' ? store.customFont : store.selectedFont;

        if (/\p{Emoji}/u.test(char)) {
          ctx.font = `${size}px ${currentFont}, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
        } else {
          ctx.font = `${size}px ${currentFont}, sans-serif`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = opacity;

        // Apply emoji style
        if (/\p{Emoji}/u.test(char)) {
          switch (store.emojiStyle) {
            case 'blackandwhite':
            case 'randomopacity':
              ctx.filter = 'grayscale(100%)';
              break;
            case 'colorful':
            default:
              ctx.filter = 'none';
              break;
          }
        }

        // Set text color
        if (!isColorTransparent) {
          ctx.fillStyle = /\p{Emoji}/u.test(char) && store.emojiStyle === 'colorful' ? '#000000' : color;
          ctx.fillText(char, 0, 0);
        }

        ctx.restore();
      });

      // Draw selection indicator for selected emoji in adjustment mode
      if (store.adjustmentMode === 'emoji' && store.layoutMode === 'manual' && store.selectedEmojiIndex >= 0) {
        const selectedEmoji = store.individualEmojis[store.selectedEmojiIndex];
        if (selectedEmoji && ctx) {
          ctx.save();
          ctx.strokeStyle = '#1890ff';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          const radius = selectedEmoji.size / 2 + 10;
          ctx.beginPath();
          ctx.arc(selectedEmoji.x, selectedEmoji.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [
    store.aspectRatio,
    store.isTransparent,
    store.backgroundColor,
    store.textOpacity,
    store.selectedFont,
    store.customFont,
    store.emojiStyle,
    store.layoutMode,
    store.individualEmojis,
    store.positions,
    store.backgroundImage,
    store.textColor,
    store.isTextColorTransparent,
    store.adjustmentMode,
    store.selectedEmojiIndex,
  ]);

  // Generate new positions
  const generateNewPositions = useCallback(async () => {
    if (store.isGenerating) return;

    store.setIsGenerating(true);

    setTimeout(() => {
      // const characters = [...store.text.trim()].filter(char => char !== ' ');
      const characters = store.text
        .trim()
        .split('\n')
        .filter((line) => line.trim() !== '');
      if (characters.length === 0) {
        store.setPositions([]);
        store.setIsGenerating(false);
        return;
      }

      const { width, height } = getCanvasDimensions(store.aspectRatio);

      if (store.layoutMode === 'manual') {
        const newIndividualEmojis = initializeIndividualEmojis();
        store.setIndividualEmojis(newIndividualEmojis);
      } else {
        const newPositions = generateDiagonalFillPositions(characters, width, height, store.minDistance || 80);
        store.setPositions(newPositions);
      }

      store.setIsGenerating(false);
    }, 10);
  }, [store, initializeIndividualEmojis, generateDiagonalFillPositions, getCanvasDimensions]);

  // Handle background image upload
  const handleBackgroundImageUpload = useCallback(
    async (file: File) => {
      try {
        const imageUrl = URL.createObjectURL(file);

        store.setBackgroundImage({
          url: imageUrl,
          objectFit: 'cover',
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
        });

        message.success('Background image uploaded successfully!');
      } catch (err) {
        console.error('Background image upload error:', err);
        message.error('Failed to upload background image. Please try again.');
      }

      return false;
    },
    [store],
  );

  // Handle font upload
  const handleFontUpload = useCallback(
    async (file: File) => {
      try {
        const fontUrl = URL.createObjectURL(file);
        const fontName = file.name.replace(/\.[^/.]+$/, '');
        const fontFace = new FontFace(fontName, `url(${fontUrl})`);
        await fontFace.load();
        (document as any).fonts.add(fontFace);

        store.setUploadedFontUrl(fontUrl);
        store.setCustomFont(fontName);
        store.setCustomFontName(fontName);

        message.success(`Font "${fontName}" loaded successfully!`);
      } catch (err) {
        console.error('Font upload error:', err);
        message.error('Failed to load the font. Please try again.');
      }

      return false;
    },
    [store],
  );

  // Download function
  const downloadThumbnail = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (store.exportFormat === 'svg') {
      // SVG generation logic would go here
      message.info('SVG export with background images is complex. Using PNG instead.');
      const link = document.createElement('a');
      link.download = 'thumbnail.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      return;
    }

    let mimeType: string;
    let quality: number | undefined;

    switch (store.exportFormat) {
      case 'jpg':
        mimeType = 'image/jpeg';
        quality = 0.9;
        break;
      case 'webp':
        mimeType = 'image/webp';
        quality = 0.9;
        break;
      case 'png':
      default:
        mimeType = 'image/png';
        break;
    }

    const link = document.createElement('a');
    link.download = `thumbnail.${store.exportFormat}`;
    link.href = canvas.toDataURL(mimeType, quality);
    link.click();
  }, [store.exportFormat]);

  // Effects
  useEffect(() => {
    const detectedFonts = detectSystemFonts();
    store.setSystemFonts(detectedFonts);
  }, []);

  // Canvas mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mouseDownHandler = (e: MouseEvent) => handleCanvasMouseDown(e);
    const mouseMoveHandler = (e: MouseEvent) => handleCanvasMouseMove(e);
    const mouseUpHandler = () => handleCanvasMouseUp();
    const wheelHandler = (e: WheelEvent) => handleCanvasWheel(e);

    canvas.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('wheel', wheelHandler);

    return () => {
      canvas.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasWheel]);

  useEffect(() => {
    if (store.layoutMode === 'manual' && store.text.trim()) {
      const newIndividualEmojis = initializeIndividualEmojis();
      store.setIndividualEmojis(newIndividualEmojis);
    }
  }, [store.layoutMode, store.emojiCount, store.text, store.aspectRatio, store.textColor, store.isTextColorTransparent]);

  useEffect(() => {
    if (store.text.trim()) {
      generateNewPositions();
    }
  }, [store.text, store.aspectRatio]);

  useEffect(() => {
    if ((store.layoutMode === 'manual' && store.individualEmojis.length > 0) || (store.layoutMode === 'auto' && store.positions.length > 0)) {
      drawCanvas();
    }
  }, [
    store.positions,
    store.individualEmojis,
    store.backgroundColor,
    store.isTransparent,
    store.textOpacity,
    store.selectedFont,
    store.customFont,
    store.emojiStyle,
    store.layoutMode,
    store.backgroundImage,
    store.textColor,
    store.isTextColorTransparent,
    store.aspectRatio,
    store.adjustmentMode,
    store.selectedEmojiIndex,
  ]);

  useEffect(() => {
    if (store.layoutMode === 'auto' && store.text.trim() && store.minDistance !== undefined) {
      generateNewPositions();
    }
  }, [store.minDistance, store.layoutMode, store.text]);

  const currentDimensions = useMemo(() => getCanvasDimensions(store.aspectRatio), [store.aspectRatio, getCanvasDimensions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto p-4">
        <Title level={2} className="mb-8 text-center">
          🎨 Enhanced Thumbnail Generator
        </Title>

        <Row gutter={[30, 12]} className="justify-center">
          {/* Controls Panel */}
          <Col xs={12} lg={5}>
            <div className="space-y-6">
              <Card title="Basic Settings" size="small">
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Text/Emojis</label>
                    <TextArea value={store.text} onChange={(e) => store.setText(e.target.value)} placeholder="Enter text or emojis..." rows={3} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Layout Mode</label>
                    <Radio.Group value={store.layoutMode} onChange={(e) => store.setLayoutMode(e.target.value)} className="w-full">
                      <Radio value="auto">Auto Layout</Radio>
                      <Radio value="manual">Manual Control</Radio>
                    </Radio.Group>
                  </div>

                  {store.layoutMode === 'manual' && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">Number of Emojis: {store.emojiCount}</label>
                      <Slider min={1} max={20} value={store.emojiCount} onChange={store.setEmojiCount} />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium">Aspect Ratio</label>
                    <Select value={store.aspectRatio} onChange={store.setAspectRatio} className="w-full" options={aspectRatios} />
                  </div>
                </Space>
              </Card>

              <Card title="Background" size="small">
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Background Type</label>
                    <div className="mb-2 flex items-center gap-2">
                      <Button size="small" type={!store.isTransparent ? 'primary' : 'default'} onClick={() => store.setIsTransparent(false)}>
                        Color
                      </Button>
                      <Button size="small" type={store.isTransparent ? 'primary' : 'default'} onClick={() => store.setIsTransparent(true)}>
                        Transparent
                      </Button>
                    </div>
                    {!store.isTransparent && <ColorPicker value={store.backgroundColor} onChange={(color) => store.setBackgroundColor(color.toHexString())} showText className="w-full" />}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Background Image</label>
                    <Upload accept="image/*" beforeUpload={handleBackgroundImageUpload} showUploadList={false} className="w-full">
                      <Button icon={<UploadOutlined />} className="w-full" type="dashed">
                        Upload Background Image
                      </Button>
                    </Upload>

                    {store.backgroundImage && (
                      <div className="mt-3 rounded border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-green-700">✓ Background image loaded</span>
                          <Button
                            size="small"
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              if (store.backgroundImage) {
                                URL.revokeObjectURL(store.backgroundImage.url);
                              }
                              store.setBackgroundImage(null);
                              store.setAdjustmentMode('none');
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>

                        <Space direction="vertical" className="w-full" size="small">
                          <div className="mb-2 flex items-center gap-2">
                            <Checkbox checked={store.adjustmentMode === 'background'} onChange={(e) => store.setAdjustmentMode(e.target.checked ? 'background' : 'none')}>
                              <span className="text-sm font-medium">Interactive Adjustment Mode</span>
                            </Checkbox>
                          </div>

                          {store.adjustmentMode === 'background' && (
                            <div className="rounded bg-blue-50 p-2 text-sm">
                              <strong>Mouse Controls:</strong>
                              <br />• Drag to move background
                              <br />• Scroll wheel to scale
                              <br />• Use sliders below for precise control
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-xs font-medium">Object Fit</label>
                            <Select
                              value={store.backgroundImage.objectFit}
                              onChange={(value) => store.updateBackgroundImage('objectFit', value)}
                              className="w-full"
                              size="small"
                              options={objectFitOptions}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium">Scale: {store.backgroundImage.scale.toFixed(2)}x</label>
                            <Slider min={0.1} max={3} step={0.1} value={store.backgroundImage.scale} onChange={(value) => store.updateBackgroundImage('scale', value)} />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium">X Position: {store.backgroundImage.x}px</label>
                            <Slider min={-400} max={400} value={store.backgroundImage.x} onChange={(value) => store.updateBackgroundImage('x', value)} />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium">Y Position: {store.backgroundImage.y}px</label>
                            <Slider min={-400} max={400} value={store.backgroundImage.y} onChange={(value) => store.updateBackgroundImage('y', value)} />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium">Rotation: {store.backgroundImage.rotation}°</label>
                            <Slider min={0} max={360} value={store.backgroundImage.rotation} onChange={(value) => store.updateBackgroundImage('rotation', value)} />
                          </div>
                        </Space>
                      </div>
                    )}
                  </div>
                </Space>
              </Card>

              <Card title="Text & Emoji Styling" size="small">
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Text/Emoji Color</label>
                    <div className="mb-2 flex items-center gap-2">
                      <Button size="small" type={!store.isTextColorTransparent ? 'primary' : 'default'} onClick={() => store.setIsTextColorTransparent(false)}>
                        Color
                      </Button>
                      <Button size="small" type={store.isTextColorTransparent ? 'primary' : 'default'} onClick={() => store.setIsTextColorTransparent(true)}>
                        Transparent
                      </Button>
                    </div>
                    {!store.isTextColorTransparent && <ColorPicker value={store.textColor} onChange={(color) => store.setTextColor(color.toHexString())} showText className="w-full" />}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Emoji Style</label>
                    <Radio.Group value={store.emojiStyle} onChange={(e) => store.setEmojiStyle(e.target.value)} className="w-full">
                      <Radio value="colorful">Colorful</Radio>
                      <Radio value="blackandwhite">Black & White</Radio>
                      <Radio value="randomopacity">B&W Random Opacity</Radio>
                    </Radio.Group>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Font Family</label>
                    <Select
                      value={store.selectedFont}
                      onChange={(value) => {
                        store.setSelectedFont(value);
                        if (value === 'custom') {
                          store.setShowCustomFont(true);
                        } else {
                          store.setShowCustomFont(false);
                        }
                      }}
                      className="w-full"
                      showSearch
                      placeholder="Select or search fonts..."
                    >
                      <Select.OptGroup label="Standard Fonts">
                        {fontOptions.map((font) => (
                          <Select.Option key={font.value} value={font.value}>
                            {font.label}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                      <Select.OptGroup label="System Fonts">
                        {store.systemFonts.map((font) => (
                          <Select.Option key={font.value} value={font.value}>
                            {font.label}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    </Select>

                    {store.showCustomFont && (
                      <div className="mt-2">
                        <Space direction="vertical" className="w-full" size="small">
                          <Dragger beforeUpload={handleFontUpload} showUploadList={false}>
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag font file to this area to upload</p>
                            <p className="ant-upload-hint">Supports: .ttf, .otf, .woff, .woff2</p>
                          </Dragger>

                          {store.uploadedFontUrl && (
                            <div className="rounded border bg-green-50 p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-green-700">✓ Font "{store.customFontName}" loaded</span>
                                <Button size="small" type="text" onClick={store.clearUploadedFont} className="text-red-500 hover:text-red-700">
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Or Enter Font Name</label>
                            <Input
                              placeholder="Enter font name manually..."
                              value={store.customFont}
                              onChange={(e) => store.setCustomFont(e.target.value)}
                              className="w-full"
                              disabled={!!store.uploadedFontUrl}
                            />
                            <div className="mt-1 text-xs text-gray-500">For system fonts or web fonts already loaded</div>
                          </div>
                        </Space>
                      </div>
                    )}
                  </div>

                  {store.layoutMode === 'auto' && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Text Opacity: {store.textOpacity}%</label>
                        <Slider min={10} max={100} value={store.textOpacity} onChange={store.setTextOpacity} />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Min Distance: {store.minDistance}px</label>
                        <Slider min={0} max={100} value={store.minDistance} onChange={store.setMinDistance} />
                      </div>
                    </>
                  )}
                </Space>
              </Card>

              {store.layoutMode === 'manual' && store.individualEmojis.length > 0 && (
                <Card title="Individual Emoji Controls" size="small">
                  <div className="mb-3">
                    <Checkbox
                      checked={store.adjustmentMode === 'emoji'}
                      onChange={(e) => {
                        store.setAdjustmentMode(e.target.checked ? 'emoji' : 'none');
                        if (!e.target.checked) {
                          store.setSelectedEmojiIndex(-1);
                        }
                      }}
                    >
                      <span className="text-sm font-medium">Interactive Adjustment Mode</span>
                    </Checkbox>

                    {store.adjustmentMode === 'emoji' && (
                      <div className="mt-2 rounded bg-blue-50 p-2 text-sm">
                        <strong>Mouse Controls:</strong>
                        <br />• Click emoji to select it
                        <br />• Drag to move selected emoji
                        <br />• Scroll wheel to resize selected emoji
                        <br />• Use sliders below for precise control
                        {store.selectedEmojiIndex >= 0 && (
                          <div className="mt-1 font-medium text-blue-700">
                            Selected: {store.individualEmojis[store.selectedEmojiIndex]?.char} Emoji {store.selectedEmojiIndex + 1}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Collapse
                    size="small"
                    items={store.individualEmojis.map((emoji, index) => ({
                      key: index.toString(),
                      label: (
                        <div className="flex items-center justify-between">
                          <span>
                            {emoji.char} Emoji {index + 1}
                          </span>
                          {store.selectedEmojiIndex === index && store.adjustmentMode === 'emoji' && <span className="mr-2 text-xs text-blue-600">● SELECTED</span>}
                        </div>
                      ),
                      extra: (
                        <div className="flex items-center gap-1">
                          <Button
                            size="small"
                            type={store.selectedEmojiIndex === index && store.adjustmentMode === 'emoji' ? 'primary' : 'default'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (store.adjustmentMode === 'emoji' && store.selectedEmojiIndex === index) {
                                store.setSelectedEmojiIndex(-1);
                              } else {
                                store.setAdjustmentMode('emoji');
                                store.setSelectedEmojiIndex(index);
                              }
                            }}
                          >
                            Select
                          </Button>
                          <SettingOutlined />
                        </div>
                      ),
                      children: (
                        <Space direction="vertical" className="w-full" size="small">
                          <div>
                            <label className="mb-1 block text-xs font-medium">X Position: {Math.round(emoji.x)}px</label>
                            <Slider min={0} max={currentDimensions.width} value={emoji.x} onChange={(value) => store.updateIndividualEmoji(index, 'x', value)} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Y Position: {Math.round(emoji.y)}px</label>
                            <Slider min={0} max={currentDimensions.height} value={emoji.y} onChange={(value) => store.updateIndividualEmoji(index, 'y', value)} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Size: {Math.round(emoji.size)}px</label>
                            <Slider min={10} max={1000} step={10} value={emoji.size} onChange={(value) => store.updateIndividualEmoji(index, 'size', value)} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Rotation: {Math.round(emoji.rotation)}°</label>
                            <Slider min={0} max={360} value={emoji.rotation} onChange={(value) => store.updateIndividualEmoji(index, 'rotation', value)} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Opacity: {Math.round(emoji.opacity * 100)}%</label>
                            <Slider min={0} max={1} step={0.01} value={emoji.opacity} onChange={(value) => store.updateIndividualEmoji(index, 'opacity', value)} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Color</label>
                            <div className="mb-1 flex items-center gap-2">
                              <Button size="small" type={!emoji.isColorTransparent ? 'primary' : 'default'} onClick={() => store.updateIndividualEmoji(index, 'isColorTransparent', false)}>
                                Color
                              </Button>
                              <Button size="small" type={emoji.isColorTransparent ? 'primary' : 'default'} onClick={() => store.updateIndividualEmoji(index, 'isColorTransparent', true)}>
                                Transparent
                              </Button>
                            </div>
                            {!emoji.isColorTransparent && (
                              <ColorPicker value={emoji.color} onChange={(color) => store.updateIndividualEmoji(index, 'color', color.toHexString())} showText size="small" className="w-full" />
                            )}
                          </div>
                        </Space>
                      ),
                    }))}
                  />
                </Card>
              )}

              <Card title="Export" size="small">
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Export Format</label>
                    <Select value={store.exportFormat} onChange={store.setExportFormat} className="w-full" options={exportFormats} />
                  </div>

                  <div className="flex gap-2">
                    <Button type="primary" icon={<ReloadOutlined />} onClick={generateNewPositions} className="flex-1" loading={store.isGenerating} disabled={!store.text.trim()}>
                      {store.layoutMode === 'manual' ? 'Reset Positions' : 'Regenerate'}
                    </Button>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={downloadThumbnail}
                      className="flex-1"
                      disabled={store.layoutMode === 'manual' ? !store.individualEmojis.length : !store.positions.length}
                    >
                      Download {store.exportFormat.toUpperCase()}
                    </Button>
                  </div>
                </Space>
              </Card>
            </div>
          </Col>

          {/* Sticky Preview Panel */}
          <Col xs={12}>
            <div className="sticky top-4">
              <Card title="Preview" className="h-full">
                <div className="flex min-h-96 items-center justify-center">
                  <div className="overflow-hidden rounded-lg border border-gray-300 shadow-lg" ref={canvasContainerRef}>
                    <canvas
                      ref={canvasRef}
                      className={`block h-auto max-w-full ${store.adjustmentMode === 'background' ? 'cursor-move' : store.adjustmentMode === 'emoji' ? 'cursor-pointer' : 'cursor-default'}`}
                      style={{ maxHeight: '500px' }}
                    />
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-gray-500">
                  Canvas Size: {currentDimensions.width} × {currentDimensions.height}px
                  {store.isGenerating && <span className="ml-2 text-blue-500">(Generating...)</span>}
                  <br />
                  Mode: {store.layoutMode === 'manual' ? `Manual (${store.individualEmojis.length} emojis)` : 'Auto Layout'} | Font:{' '}
                  {store.selectedFont === 'custom' ? store.customFont || 'Custom Font' : store.selectedFont} | Style: {store.emojiStyle} | Format: {store.exportFormat.toUpperCase()}
                  {store.backgroundImage && <span className="ml-2">| Background: ✓</span>}
                  {store.adjustmentMode !== 'none' && (
                    <span className="ml-2 text-blue-600">
                      | Interactive Mode: {store.adjustmentMode === 'background' ? 'Background' : 'Emoji'}
                      {store.adjustmentMode === 'emoji' && store.selectedEmojiIndex >= 0 && ` (${store.individualEmojis[store.selectedEmojiIndex]?.char} ${store.selectedEmojiIndex + 1})`}
                    </span>
                  )}
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ThumbnailGenerator;
