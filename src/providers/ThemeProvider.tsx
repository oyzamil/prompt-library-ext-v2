import '@/assets/tailwind.css';
import { StyleProvider } from '@ant-design/cssinjs';
import '@ant-design/v5-patch-for-react-19';
import '@fontsource/poppins';

import { theme as AntdTheme, App, ConfigProvider } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { GlobalToken } from 'antd/es/theme/interface';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const { APP } = useAppConfig();

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children?: ReactNode;
  shadowContainer?: HTMLElement | ShadowRoot | null;
  popupContainer?: HTMLElement | null;
  theme?: ThemeType;
  cssContainer?: HTMLElement | null;
}

interface AntdContextProps {
  notification: NotificationInstance;
  message: MessageInstance;
  modal: Omit<ModalStaticFunctions, 'warn'>;
  theme?: ThemeType;
  token: GlobalToken;
}

let AntdContext: React.Context<AntdContextProps | null>;

if (!(globalThis as any).__antd_context__) {
  (globalThis as any).__antd_context__ = createContext<AntdContextProps | null>(null);
}
AntdContext = (globalThis as any).__antd_context__;

const StaticComponents = ({ children, shadowContainer, popupContainer, theme, cssContainer }: ThemeProviderProps) => {
  const { token } = AntdTheme.useToken();
  const currentAlgorithm = theme === 'dark' ? AntdTheme.darkAlgorithm : AntdTheme.defaultAlgorithm;

  const effectivePopupContainer = popupContainer || (shadowContainer instanceof ShadowRoot ? (shadowContainer.host as HTMLElement) : shadowContainer) || document.body;

  return (
    <StyleProvider container={cssContainer || shadowContainer || document.body} layer hashPriority="high">
      <ConfigProvider
        theme={{
          algorithm: currentAlgorithm,
          token: {
            colorPrimary: APP.COLOR_PRIMARY,
            fontFamily: [APP.FONT_FAMILY, token.fontFamily].toString(),
          },
        }}
        getPopupContainer={() => effectivePopupContainer}
        getTargetContainer={() => effectivePopupContainer}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
};

const DynamicComponents = ({ children, theme }: { children: ReactNode; theme: ThemeType }) => {
  const staticContext = App.useApp();
  const { message, notification, modal } = staticContext;
  const { token } = AntdTheme.useToken();

  return <AntdContext.Provider value={{ message, notification, modal, theme, token }}>{children}</AntdContext.Provider>;
};

export const ThemeProvider = ({ children, shadowContainer, popupContainer, cssContainer }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const { settings } = useSettings();

  useEffect(() => {
    let resolvedTheme: ThemeType = 'light';

    if (settings.theme === 'system') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = isSystemDark ? 'dark' : 'light';
    } else {
      resolvedTheme = settings.theme;
    }

    setTheme(resolvedTheme);
    updateBodyClass(resolvedTheme);
  }, [settings]);

  const updateBodyClass = (theme: ThemeType) => {
    const doc = document.documentElement;
    doc.classList.toggle('dark', theme === 'dark');
    doc.classList.toggle('light', theme === 'light');

    if (theme === 'dark') {
      doc.setAttribute('data-theme', 'dark');
    } else {
      doc.removeAttribute('data-theme');
    }
  };

  return (
    <StaticComponents shadowContainer={shadowContainer} popupContainer={popupContainer} theme={theme} cssContainer={cssContainer}>
      <App>
        <DynamicComponents theme={theme}>{children}</DynamicComponents>
      </App>
    </StaticComponents>
  );
};

export const useAntd = (): AntdContextProps => {
  const context = useContext(AntdContext);
  if (!context) {
    throw new Error('useAntd must be used within an AntdProvider');
  }
  return context;
};

const applyStyles = (style: ApplyStyles, anchor: string, shadowHost: HTMLElement, uiContainer: HTMLElement): void => {
  try {
    if (style?.root) {
      injectStyleToMainDom(style.root);
    }

    if (style?.anchor) {
      const anchorEl = document.querySelector(anchor) as HTMLElement | null;
      if (anchorEl) {
        Object.assign(anchorEl.style, style.anchor);
      }
    }

    if (style?.anchorParent) {
      const anchorParent = document.querySelector(anchor)?.parentElement as HTMLElement | null;
      if (anchorParent) {
        Object.assign(anchorParent.style, style.anchorParent);
      }
    }

    if (style?.shadowHost) {
      Object.assign(shadowHost.style, style.shadowHost);
    }

    if (style?.uiContainer) {
      Object.assign(uiContainer.style, style.uiContainer);
    }
  } catch (error) {
    console.error('Failed to apply styles:', error);
  }
};

export const createAndMountUI = async (ctx: any, props: CreateAndMountUI) => {
  const { anchor, position = 'inline', children, style, id = 'softweb-tuts' } = props;

  try {
    const ui = await createShadowRootUi(ctx, {
      name: id,
      position: position,
      anchor: anchor,
      onMount: (uiContainer, shadow, shadowHost) => {
        const cssContainer = shadow.querySelector('head')!;
        shadowHost.id = id;

        if (style) {
          requestAnimationFrame(() => {
            applyStyles(style, anchor, shadowHost, uiContainer);
          });
        }

        const root = createRoot(uiContainer);
        root.render(
          <ThemeProvider shadowContainer={shadow} popupContainer={uiContainer} cssContainer={cssContainer}>
            {children}
          </ThemeProvider>,
        );
        return { root, uiContainer };
      },
      onRemove: (elements) => {
        if (elements?.root && elements?.uiContainer) {
          elements?.root.unmount();
          elements?.uiContainer.remove();
        }
      },
    });

    if (!document.getElementById(id)) {
      ui.mount();
    }
    return ui;
  } catch (error) {
    console.error(`Failed to mount UI to anchor: ${anchor}`, error);
    return null;
  }
};

export { StyleProvider };
