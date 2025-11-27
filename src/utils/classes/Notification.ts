type NotificationOptions = chrome.notifications.NotificationOptions<true>;

interface NotificationDefaults {
  notificationId?: string;
  type?: chrome.notifications.TemplateType;
  iconUrl?: string;
  priority?: number;
  requireInteraction?: boolean;
}

export class Notification {
  private static defaults: Required<NotificationDefaults> = {
    notificationId: `crx-notification-${Math.random().toString(36).substring(2, 15)}`,
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/48.png' as any),
    priority: 1,
    requireInteraction: false,
  };

  static setDefaults(newDefaults: Partial<NotificationDefaults>) {
    this.defaults = {
      ...this.defaults,
      ...newDefaults,
    };
  }

  static create(
    options: Omit<NotificationOptions, 'type' | 'iconUrl' | 'priority' | 'requireInteraction'> & Partial<NotificationOptions>,
    notificationId?: string
  ): Promise<string> {
    const finalId = notificationId ?? this.defaults.notificationId;
    const finalOptions: NotificationOptions = {
      type: this.defaults.type,
      iconUrl: this.defaults.iconUrl,
      priority: this.defaults.priority,
      requireInteraction: this.defaults.requireInteraction,
      ...options,
    };

    return new Promise((resolve, reject) => {
      browser.notifications.create(finalId, finalOptions, (id) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(id);
        }
      });
    });
  }

  static clear(notificationId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      browser.notifications.clear(notificationId, (wasCleared) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(wasCleared);
        }
      });
    });
  }

  static update(notificationId: string, options: Partial<NotificationOptions>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      browser.notifications.update(notificationId, options, (wasUpdated) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(wasUpdated);
        }
      });
    });
  }

  static getAll(): Promise<Record<string, NotificationOptions>> {
    return new Promise((resolve, reject) => {
      browser.notifications.getAll((notifications) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(notifications as unknown as Record<string, NotificationOptions>);
        }
      });
    });
  }

  static async clearAll(): Promise<void> {
    const notifications = await this.getAll();
    await Promise.all(Object.keys(notifications).map((id) => this.clear(id)));
  }

  static async createOrUpdate(
    options: Omit<NotificationOptions, 'type' | 'iconUrl' | 'priority' | 'requireInteraction'> & Partial<NotificationOptions>,
    notificationId?: string
  ): Promise<string> {
    const finalId = notificationId ?? this.defaults.notificationId;
    const finalOptions: NotificationOptions = {
      type: this.defaults.type,
      iconUrl: this.defaults.iconUrl,
      priority: this.defaults.priority,
      requireInteraction: this.defaults.requireInteraction,
      ...options,
    };

    const notifications = await this.getAll();
    if (finalId in notifications) {
      await this.update(finalId, finalOptions);
      return finalId;
    } else {
      return await this.create(options, finalId);
    }
  }
}
