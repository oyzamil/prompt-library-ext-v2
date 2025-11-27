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
type DeepPartial<T> =
  | Partial<T> // ✅ allow shallow Partial
  | (T extends Function | Date | RegExp ? T : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T);

type Language = (typeof LANGUAGES)[number];
type Providers = (typeof PROVIDERS)[number];
type ResType = (typeof RES_TYPES)[number];
type ResTone = (typeof RES_TONES)[number];

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

declare global {
  interface Navigator {
    readonly userAgentData?: NavigatorUAData;
  }
}