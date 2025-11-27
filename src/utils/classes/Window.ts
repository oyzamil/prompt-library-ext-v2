class Window {
  static async get<T>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      browser.windows.get(Number(key), (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(result as T);
        }
      });
    });
  }

  static async remove(windowId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      browser.windows.remove(windowId, () => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static async update(windowId: number, updateProperties: Browser.windows.UpdateInfo): Promise<Browser.windows.Window> {
    return new Promise((resolve, reject) => {
      browser.windows.update(windowId, updateProperties, (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  static onRemoved(callback: (windowId: number) => void) {
    browser.windows.onRemoved.addListener(callback);
  }

  static onCreated(callback: (window: Browser.windows.Window) => void) {
    browser.windows.onCreated.addListener(callback);
  }
}

export default Window;
