// https://www.quirksmode.org/js/cookies.html

export default {
  set: async function (name, value, ttl) {
    return await storage.set(name, value, ttl);
  },
  get: async function (name) {
    return await storage.get(name);
  },
};
