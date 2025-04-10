// https://www.quirksmode.org/js/cookies.html
import localforage from 'localforage';

localforage.config({
  name: 'YawlStorage',
  storeName: 'analytics',
  version: 1.0,
  driver: localforage.INDEXEDDB,
});

export const storage = {
  async set(key, value, ttl) {
    try {
      const item = {
        value,
        expires: ttl
          ? new Date(Date.now() + ttl * 60 * 1000).toUTCString()
          : null,
      };
      await localforage.setItem(key, item);
      return true;
    } catch (error) {
      console.error('Error setting storage item:', error);
      return false;
    }
  },
  async get(key) {
    try {
      const item = await localforage.getItem(key);
      if (!item) return null;

      if (item.expires && new Date().getTime() > item.expires) {
        await localforage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Error getting storage item:', error);
      return null;
    }
  },
};

export async function initStorage() {
  try {
    await localforage.ready();
    if (!localforage.supports(localforage.INDEXEDDB)) {
      console.warn(
        'IndexedDB is not supported in this environment. Yawl storage may not work properly.',
      );
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return null;
  }
}

export default {
  set: async function (name, value, ttl) {
    return await storage.set(name, value, ttl);
  },
  get: async function (name) {
    return await storage.get(name);
  },
};
