import { URLS, config } from "./config";
import { initStorage } from "./cookies";
import {
  CSRFProtection,
  canStringify,
  canTrackNow,
  cleanObject,
  csrfParam,
  csrfToken,
  destroyCookie,
  documentReady,
  eventsUrl,
  generateId,
  getBrowserInfo,
  getClosest,
  getCookie,
  getDeviceType,
  getDomainFromUrl,
  getOSAndVersion,
  getQueryParam,
  log,
  onEvent,
  page,
  presence,
  setCookie,
  visitsUrl,
} from "./helpers";

/**
 * -------------------------- Old public functions ----------------------------------
 */

// eslint-disable-next-line no-unused-vars
function reset() {
  destroyCookie("ahoy_visit");
  destroyCookie("ahoy_visitor");
  destroyCookie("ahoy_events");
  destroyCookie("ahoy_track");
  return true;
}

// eslint-disable-next-line no-unused-vars
function debug(enabled) {
  if (enabled === false) {
    destroyCookie("ahoy_debug");
  } else {
    setCookie("ahoy_debug", "t", 365 * 24 * 60); // 1 year
  }
  return true;
}

// eslint-disable-next-line no-unused-vars
function trackClicks(selector) {
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("click", selector, function (e) {
    const properties = eventProperties.call(this, e);
    properties.text =
      properties.tag === "input"
        ? this.value
        : (this.textContent || this.innerText || this.innerHTML)
            .replace(/[\s\r\n]+/g, " ")
            .trim();
    properties.href = this.href;
    properties.name = "$click";
    yawl.track(properties);
  });
}

// eslint-disable-next-line no-unused-vars
function trackSubmits(selector) {
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("submit", selector, function (e) {
    const properties = eventProperties.call(this, e);
    properties.name = "$submit";
    yawl.track(properties);
  });
}

// eslint-disable-next-line no-unused-vars
function trackChanges(selector) {
  log("trackChanges is deprecated and will be removed in 0.5.0");
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("change", selector, function (e) {
    const properties = eventProperties.call(this, e);
    properties.name = "$change";
    yawl.track(properties);
  });
}

/**
 * -------------------------------------------------------
 */
/**
 * Yawl Analytics Library
 * @namespace Yawl
 */
const yawl = window.yawl || {};

/**
 * Configures the Yawl analytics library with your API key.
 * This function must be called before tracking events.
 * @function
 * @memberof Yawl
 * @param {Object} config - Configuration options for the Yawl library.
 * @param {string} config.apiKey - The API key for initializing the analytics tracking.
 * @param {'prod' | 'staging'=} config.env - The API key for initializing the analytics tracking.
 */
yawl.configure = async ({ apiKey, env = "prod" }) => {
  if (!apiKey) {
    console.error("Erreur: l'argument api_key est requis.");
    return;
  }
  if (typeof apiKey !== "string") {
    console.error(
      "Erreur: l'argument api_key doit être une chaine de caractère",
    );
    return;
  }
  await initStorage();
  await initEventQueue();
  config.apiKey = apiKey;
  config.urlPrefix = env === "prod" ? URLS.PROD : URLS.STAGING;
};

const $ = window.jQuery || window.Zepto || window.$;
let visitId, visitorId, track;
let isReady = false;
const queue = [];

let eventQueue = [];

async function initEventQueue() {
  try {
    const storedEvents = await getCookie("ahoy_events");
    eventQueue = JSON.parse(storedEvents || "[]");

    // Process the queue after initialization
    for (let i = 0; i < eventQueue.length; i++) {
      trackEvent(eventQueue[i]);
    }
  } catch (e) {
    // do nothing
  }
}

function setReady() {
  let callback;
  while ((callback = queue.shift())) {
    callback();
  }
  isReady = true;
}

yawl.ready = (callback) => {
  if (isReady) {
    callback();
  } else {
    queue.push(callback);
  }
};

async function saveEventQueue() {
  if (config.cookies && canStringify) {
    await setCookie("ahoy_events", JSON.stringify(eventQueue), 1);
  }
}

function sendRequest(url, data, success) {
  const headers = Object.assign({}, config.headers);
  if (config.apiKey) {
    headers["api-key"] = config.apiKey;
  }

  if (canStringify) {
    if ($ && $.ajax) {
      $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        beforeSend: CSRFProtection,
        success,
        headers,
        xhrFields: {
          withCredentials: config.withCredentials,
        },
      });
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.withCredentials = config.withCredentials;
      xhr.setRequestHeader("Content-Type", "application/json");
      for (const header in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, header)) {
          xhr.setRequestHeader(header, headers[header]);
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          success();
        }
      };
      CSRFProtection(xhr);
      xhr.send(JSON.stringify(data));
    }
  }
}

function eventData(event) {
  /**
   * In our current application, the “visit_token” and “visitor_token” tokens are sent directly via the body.
   */
  // if (config.cookies) {
  //   data.visit_token = event.visit_token;
  //   data.visitor_token = event.visitor_token;
  // }
  // delete event.visit_token;
  // delete event.visitor_token;
  return event;
}

function trackEvent(event) {
  yawl.ready(() => {
    sendRequest(eventsUrl(), eventData(event), () => {
      // remove from queue
      for (let i = 0; i < eventQueue.length; i++) {
        if (eventQueue[i].id === event.id) {
          eventQueue.splice(i, 1);
          break;
        }
      }
      saveEventQueue();
    });
  });
}

function trackEventNow(event) {
  yawl.ready(() => {
    const data = eventData(event);
    const param = csrfParam();
    const token = csrfToken();
    if (param && token) data[param] = token;

    // delete data.visitor_token;

    fetch(eventsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({ event: data }),
    })
      .then(() => {})
      .catch((error) => {
        console.error("Erreur lors de l'envoi de l'événement:", error);
      });
  });
}

function eventProperties() {
  return cleanObject({
    tag: this.tagName.toLowerCase(),
    id: presence(this.id),
    class: presence(this.className),
    page: page(),
    section: getClosest(this, "data-section"),
  });
}

async function createVisit() {
  isReady = false;

  visitId = await yawl.getVisitId();
  visitorId = await yawl.getVisitorId();
  track = await getCookie("ahoy_track");

  if (config.cookies === false || config.trackVisits === false) {
    log("Visit tracking disabled");
    setReady();
  } else if (visitId && visitorId && !track) {
    // TODO keep visit alive?
    log("Active visit");
    setReady();
  } else {
    if (!visitId) {
      visitId = generateId();
      await setCookie("ahoy_visit", visitId, config.visitDuration);
    }

    const testVisit = await getCookie("ahoy_visit");
    if (testVisit) {
      log("Visit started");

      if (!visitorId) {
        visitorId = generateId();
        await setCookie("ahoy_visitor", visitorId, config.visitorDuration);
      }

      const { os, version } = getOSAndVersion();

      const data = {
        visit_token: visitId,
        visitor_token: visitorId,
        platform: config.platform,
        landing_page: window.location.href,
        js: true,
        browser: getBrowserInfo(),
        user_agent: navigator.userAgent,
        os,
        os_version: version,
        device_type: getDeviceType(),
        started_at: new Date().toISOString(),
      };

      // referrer
      if (document.referrer && document.referrer.length > 0) {
        data.referrer = document.referrer;
        data.referring_domain = getDomainFromUrl(document.referrer);
      }

      data.utm_campaign = getQueryParam("utm_campaign");
      data.utm_content = getQueryParam("utm_content");
      data.utm_medium = getQueryParam("utm_medium");
      data.utm_source = getQueryParam("utm_source");
      data.utm_term = getQueryParam("utm_term");

      log(data);

      sendRequest(visitsUrl(), { visit: data }, async () => {
        // wait until successful to destroy
        await destroyCookie("ahoy_track");
        setReady();
      });
    } else {
      log("Cookies disabled");
      setReady();
    }
  }
}

/**
 * Retrieves the current visit token from cookies.
 * @returns {string|null} The visit token, or null if not set.
 */
yawl.getVisitId = yawl.getVisitToken = async () =>
  await getCookie("ahoy_visit");

/**
 * Retrieves the current visitor token from cookies.
 * @returns {string|null} The visitor token, or null if not set.
 */
yawl.getVisitorId = yawl.getVisitorToken = async () =>
  await getCookie("ahoy_visitor");

/**
 * @typedef {Object} EventProperties
 * @property {number} [ean] - The article ID associated with the event.
 * @property {string} [establishment_account_id] - The establishment account ID.
 * @property {string} [name] - The name of the event.
 * @property {Record<string, unknown>} [properties] - Additional properties related to the event.
 * @property {string} [user_type] - The type of user (e.g. "client", "admin", etc.).
 */

/**
 * @typedef {Omit<EventProperties, 'name'>} ViewEventProperties
 */

/**
 * Tracks a custom event.
 * The event is queued and sent via the configured transport method.
 *
 * @function
 * @memberof Yawl
 * @param {EventProperties} [properties={}] - Additional properties to associate with the event.
 * @returns {boolean} True if the event is successfully queued for tracking.
 *
 * @example
 * yawl.track({
 *  name: "event_name",
 *  ean: 12323938432,
 *  establishment_account_id: "456",
 *  properties: {
 *    key: "value"
 *  },
 *  user_type: "student",
 * });
 */

yawl.track = async (properties = {}) => {
  // generate unique id
  const event = Object.assign({}, properties, {
    time: new Date().toISOString(),
    id: generateId(),
    js: true,
  });

  yawl.ready(async () => {
    if (config.cookies && !(await yawl.getVisitId())) {
      await createVisit();
    }

    yawl.ready(async () => {
      log(event);

      event.visit_token = await yawl.getVisitId();
      event.visitor_token = await yawl.getVisitorId();

      if (canTrackNow()) {
        trackEventNow(event);
      } else {
        eventQueue.push(event);
        await saveEventQueue();

        // wait in case navigating to reduce duplicate events
        setTimeout(() => {
          trackEvent(event);
        }, 1000);
      }
    });
  });

  return true;
};

/**
 * Tracks a page view event.
 * Automatically collects URL, title, and page path information.
 * You can pass additional properties to enrich the page view data.
 *
 * @function
 * @memberof Yawl
 * @param {ViewEventProperties} [additionalProperties={}] - Additional properties to include in the page view event.
 */
yawl.trackView = async (additionalProperties) => {
  const properties = {
    name: "$view",
    url: window.location.href,
    title: document.title,
    page: page(),
  };

  if (additionalProperties) {
    for (const propName in additionalProperties) {
      if (
        Object.prototype.hasOwnProperty.call(additionalProperties, propName)
      ) {
        properties[propName] = additionalProperties[propName];
      }
    }
  }
  await yawl.track(properties);
};

yawl.start = async () => {
  await createVisit();
  yawl.start = () => {};
};

documentReady(async () => {
  if (config.startOnReady) {
    await yawl.start();
  }
});

export default yawl;
