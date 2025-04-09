// https://www.quirksmode.org/js/cookies.html
import localforage from 'localforage';

localforage.config({
  name: 'YawlStorage',
  storeName: 'analytics',
  version: 1.0,
  driver: localforage.INDEXEDDB,
});

export default {
  set: async function (name, value, ttl) {
    return await storage.set(name, value, ttl);
  },
  get: async function (name) {
    return await storage.get(name);
  },
};
