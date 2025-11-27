class Tabs {
  /**
   * Create a new tab
   * @param tab Tab information
   * @returns
   */
  static async create(tab: Browser.tabs.CreateProperties) {
    return new Promise<Browser.tabs.Tab>((resolve, reject) => {
      try {
        browser.tabs.create(tab, (tab) => {
          if (browser.runtime.lastError) {
            return reject(browser.runtime.lastError);
          }
          resolve(tab);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Query tabs
   * @param queryInfo Query criteria
   * @returns
   */
  static async query(queryInfo: Browser.tabs.QueryInfo = {}) {
    return new Promise<Browser.tabs.Tab[]>((resolve, reject) => {
      try {
        browser.tabs.query(queryInfo, (tabs) => {
          if (browser.runtime.lastError) {
            return reject(browser.runtime.lastError);
          }
          resolve(tabs);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Close a tab
   * @param tabId Tab ID
   * @returns
   */
  static async remove(tabId: number) {
    return new Promise<void>((resolve, reject) => {
      try {
        browser.tabs.remove(tabId, () => {
          if (browser.runtime.lastError) {
            return reject(browser.runtime.lastError);
          }
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Update a tab
   * @param tabId Tab ID
   * @param updateProperties Update properties
   * @returns
   */
  static async update(tabId: number, updateProperties: Browser.tabs.UpdateProperties) {
    return new Promise<Browser.tabs.Tab>((resolve, reject) => {
      try {
        browser.tabs.update(tabId, updateProperties, (tab) => {
          if (browser.runtime.lastError) {
            return reject(browser.runtime.lastError);
          }
          resolve(tab!);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  static onCreated(callback: (tab: Browser.tabs.Tab) => void) {
    browser.tabs.onCreated.addListener(callback);
  }

  static onUpdated(callback: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: Browser.tabs.Tab) => void) {
    browser.tabs.onUpdated.addListener(callback);
  }

  static onRemoved(callback: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void) {
    browser.tabs.onRemoved.addListener(callback);
  }
}

export default Tabs;
