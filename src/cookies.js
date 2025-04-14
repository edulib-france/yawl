import localforage from "localforage";

export const storage = {
  async set(key, value, ttl) {
    try {
      const item = {
        value,
        expires: ttl
          ? new Date(Date.now() + ttl * 60 * 1000).toUTCString()
          : null,
      };
      return await localforage.setItem(key, item);
    } catch (error) {
      console.error("Error setting storage item:", error);
      return null;
    }
  },
  async get(key) {
    try {
      const item = await localforage.getItem(key);
      if (!item) return null;

      const now = new Date();
      const expiryDate = new Date(item.expires);

      if (now > expiryDate) {
        await localforage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn("Error getting storage item:", error);
      return null;
    }
  },
  async removeItem(key) {
    try {
      await localforage.removeItem(key);
    } catch (error) {
      console.warn("Error removing storage item:", error);
      return null;
    }
  },
};

export async function initStorage() {
  try {
    localforage.config({
      name: "YawlStorage",
      storeName: "analytics",
      version: 1.0,
    });
    await localforage.ready();
    console.info(`Yawl storage is using ${localforage.driver()} driver`);
  } catch (error) {
    console.error("Failed to initialize Yawl storage:", error);
    return null;
  }
}

export default {
  set: async function (key, value, ttl) {
    return await storage.set(key, value, ttl);
  },
  get: async function (key) {
    return await storage.get(key);
  },
  remove: async function (key) {
    return await storage.removeItem(key);
  },
};
