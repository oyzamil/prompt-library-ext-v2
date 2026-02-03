type StyleObject = Partial<CSSStyleDeclaration>;

interface ApplyStyles {
  root?: string;
  anchor?: StyleObject;
  anchorParent?: StyleObject;
  shadowHost?: StyleObject;
  uiContainer?: StyleObject;
}
interface CreateAndMountUI {
  anchor: string;
  position?: 'inline' | 'overlay' | 'modal';
  children: ReactNode;
  id?: string;
  style?: ApplyStyles;
}
type ProfileData = {
  profiles: string[];
  lastInteracted: Record<string, number>;
};
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? (T[P] extends any[] ? T[P] : DeepPartial<T[P]>) : T[P];
};

interface NavigatorUADataBrandVersion {
  readonly brand: string;
  readonly version: string;
}

interface UADataValues {
  readonly architecture?: string;
  readonly bitness?: string;
  readonly brands?: NavigatorUADataBrandVersion[];
  readonly mobile?: boolean;
  readonly model?: string;
  readonly platform?: string;
  readonly platformVersion?: string;
  readonly uaFullVersion?: string;
  // Add other high entropy values as needed
}

interface NavigatorUAData extends UADataValues {
  getHighEntropyValues(hints: string[]): Promise<UADataValues>;
  toJSON(): UADataValues;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}

/**
 * Categorical data structure
 */
interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Prompt data structure
 */
interface PromptItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  enabled: boolean;
  categoryId: string;
  pinned?: boolean; //Top field
  notionPageId?: string;
  notes?: string; // Remarks field
  lastModified?: string; // Last modified time (ISO string)
  sortOrder?: number; // Sorting field, used for drag and drop sorting
}

interface PromptItemWithVariables extends PromptItem {
  /**
   * The parsed variables are not persisted.
   */
  _variables?: string[];
}

// Custom interface for unified processing of different types of text input elements
interface EditableElement {
  value: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  focus(): void;
  setSelectionRange?(start: number, end: number): void;
  dispatchEvent(event: Event): boolean;
}
