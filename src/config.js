import { getPlatform } from "./helpers";

export const URLS = {
  PROD: "https://www.edulib.fr",
  STAGING: "https://staging.edulib.fr",
};

export const config = {
  urlPrefix: URLS.PROD,
  visitsUrl: "/ahoy/visits",
  eventsUrl: "/ahoy/events",
  page: null,
  platform: getPlatform(),
  useBeacon: true,
  startOnReady: true,
  trackVisits: true,
  cookies: true,
  cookieDomain: null,
  headers: {},
  visitParams: {},
  withCredentials: false,
  visitDuration: 4 * 60, // default 4 hours
  visitorDuration: 2 * 365 * 24 * 60, // default 2 years
  debug: false,
};
