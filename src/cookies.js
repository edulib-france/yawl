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
          ? new Date(new Date().getTime() + ttl * 60 * 1000).toUTCString()
          : null,
      };
      await localforage.setItem(key, item);
      return true;
    } catch (error) {
      console.error('Error setting storage item:', error);
      return false;
    }
  },
};

export default {
  set: async function (name, value, ttl) {
    return await storage.set(name, value, ttl);
  },
  get: async function (name) {
    return await storage.get(name);
  },
};
