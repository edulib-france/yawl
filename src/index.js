import { destroyCookie, generateId, getBrowserInfo, getCookie, getDeviceType, getDomainFromUrl, getOSAndVersion, getQueryParam, log, setCookie } from './helpers';

const config = {
  urlPrefix: "https://staging.edulib.fr",
  visitsUrl: "/ahoy/visits",
  eventsUrl: "/ahoy/events",
  page: null,
  platform: "Web",
  useBeacon: true,
  startOnReady: true,
  trackVisits: true,
  cookies: true,
  cookieDomain: null,
  headers: {},
  visitParams: {},
  withCredentials: false,
  visitDuration: 4 * 60, // default 4 hours
  visitorDuration: 2 * 365 * 24 * 60 // default 2 years
};



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
};

// eslint-disable-next-line no-unused-vars
function debug(enabled) {
  if (enabled === false) {
    destroyCookie("ahoy_debug");
  } else {
    setCookie("ahoy_debug", "t", 365 * 24 * 60); // 1 year
  }
  return true;
};

// eslint-disable-next-line no-unused-vars
function trackClicks(selector) {
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("click", selector, function (e) {
    const properties = eventProperties.call(this, e);
    properties.text = properties.tag === "input" ? this.value : (this.textContent || this.innerText || this.innerHTML).replace(/[\s\r\n]+/g, " ").trim();
    properties.href = this.href;
    ahoy.track("$click", properties);
  });
};

// eslint-disable-next-line no-unused-vars
function trackSubmits(selector) {
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("submit", selector, function (e) {
    const properties = eventProperties.call(this, e);
    ahoy.track("$submit", properties);
  });
};

// eslint-disable-next-line no-unused-vars
function trackChanges(selector) {
  log("trackChanges is deprecated and will be removed in 0.5.0");
  if (selector === undefined) {
    throw new Error("Missing selector");
  }
  onEvent("change", selector, function (e) {
    const properties = eventProperties.call(this, e);
    ahoy.track("$change", properties);
  });
};

/**
 * -------------------------------------------------------
 */

const ahoy = window.ahoy || window.Ahoy || {};

ahoy.configure = function (apiKey) {
  if (!apiKey) {
    console.error("Erreur: l'argument api_key est requis.");
    return;
  }
  if (typeof apiKey !== 'string') {
    console.error("Erreur: l'argument api_key doit être une chaine de caractère");
    return;
  }
  config.apiKey = apiKey;
};

// legacy
ahoy.configure(ahoy);

const $ = window.jQuery || window.Zepto || window.$;
let visitId, visitorId, track;
let isReady = false;
const queue = [];
const canStringify = typeof (JSON) !== "undefined" && typeof (JSON.stringify) !== "undefined";
let eventQueue = [];

function visitsUrl() {
  return config.urlPrefix + config.visitsUrl;
}

function eventsUrl() {
  return config.urlPrefix + config.eventsUrl;
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function canTrackNow() {
  return (config.useBeacon || config.trackNow) && isEmpty(config.headers) && canStringify && typeof (window.navigator.sendBeacon) !== "undefined" && !config.withCredentials;
}

function setReady() {
  let callback;
  while ((callback = queue.shift())) {
    callback();
  }
  isReady = true;
}

ahoy.ready = function (callback) {
  if (isReady) {
    callback();
  } else {
    queue.push(callback);
  }
};

function matchesSelector(element, selector) {
  const matches = element.matches ||
    element.matchesSelector ||
    element.mozMatchesSelector ||
    element.msMatchesSelector ||
    element.oMatchesSelector ||
    element.webkitMatchesSelector;

  if (matches) {
    if (matches.apply(element, [selector])) {
      return element;
    } else if (element.parentElement) {
      return matchesSelector(element.parentElement, selector);
    }
    return null;
  } else {
    log("Unable to match");
    return null;
  }
}

function onEvent(eventName, selector, callback) {
  document.addEventListener(eventName, function (e) {
    const matchedElement = matchesSelector(e.target, selector);
    if (matchedElement) {
      const skip = getClosest(matchedElement, "data-ahoy-skip");
      if (skip !== null && skip !== "false") return;

      callback.call(matchedElement, e);
    }
  });
}

// http://beeker.io/jquery-document-ready-equivalent-vanilla-javascript
function documentReady(callback) {
  if (document.readyState === "interactive" || document.readyState === "complete") {
    setTimeout(callback, 0);
  } else {
    document.addEventListener("DOMContentLoaded", callback);
  }
}

function saveEventQueue() {
  if (config.cookies && canStringify) {
    setCookie("ahoy_events", JSON.stringify(eventQueue), 1);
  }
}

// from rails-ujs

function csrfToken() {
  const meta = document.querySelector("meta[name=csrf-token]");
  return meta && meta.content;
}

function csrfParam() {
  const meta = document.querySelector("meta[name=csrf-param]");
  return meta && meta.content;
}

function CSRFProtection(xhr) {
  const token = csrfToken();
  if (token) xhr.setRequestHeader("X-CSRF-Token", token);
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
          withCredentials: config.withCredentials
        }
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
      xhr.onload = function () {
        if (xhr.status === 200) {
          success();
        }
      };
      CSRFProtection(xhr);
      xhr.send(JSON.stringify(data));
    }
  }
}

function eventData(event) {
  const data = {
    events: [event]
  };
  if (config.cookies) {
    data.visit_token = event.visit_token;
    data.visitor_token = event.visitor_token;
  }
  delete event.visit_token;
  delete event.visitor_token;
  return data;
}

function trackEvent(event) {
  ahoy.ready(function () {
    sendRequest(eventsUrl(), eventData(event), function () {
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
  ahoy.ready(function () {
    const data = eventData(event);
    const param = csrfParam();
    const token = csrfToken();
    if (param && token) data[param] = token;
    data.time = new Date();
    data.article_id = 1234;
    data.establishment_account_id = 654;
    data.name = "event test";
    data.user_type = "student";
    delete data.events;
    delete data.visitor_token;
    fetch(eventsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey
      },
      body: JSON.stringify(data)
    })
      .then(response => { })
      .catch(error => {
        console.error("Erreur lors de l'envoi de l'événement:", error);
      });
  });
}

function page() {
  return config.page || window.location.pathname;
}

function presence(str) {
  return (str && str.length > 0) ? str : null;
}

function cleanObject(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key] === null) {
        delete obj[key];
      }
    }
  }
  return obj;
}

function eventProperties() {
  return cleanObject({
    tag: this.tagName.toLowerCase(),
    id: presence(this.id),
    "class": presence(this.className),
    page: page(),
    section: getClosest(this, "data-section")
  });
}

function getClosest(element, attribute) {
  for (; element && element !== document; element = element.parentNode) {
    if (element.hasAttribute(attribute)) {
      return element.getAttribute(attribute);
    }
  }

  return null;
}

function createVisit() {
  isReady = false;

  visitId = ahoy.getVisitId();
  visitorId = ahoy.getVisitorId();
  track = getCookie("ahoy_track");

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
      setCookie("ahoy_visit", visitId, config.visitDuration);
    }

    // make sure cookies are enabled
    if (getCookie("ahoy_visit")) {
      log("Visit started");

      if (!visitorId) {
        visitorId = generateId();
        setCookie("ahoy_visitor", visitorId, config.visitorDuration);
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
        started_at: new Date().toISOString()
      };

      // referrer
      if (document.referrer && document.referrer.length > 0) {
        data.referrer = document.referrer;
        data.referring_domain = getDomainFromUrl(document.referrer);
      }

      data.utm_campaign = getQueryParam('utm_campaign');
      data.utm_content = getQueryParam('utm_content');
      data.utm_medium = getQueryParam('utm_medium');
      data.utm_source = getQueryParam('utm_source');
      data.utm_term = getQueryParam('utm_term');

      log(data);

      sendRequest(visitsUrl(), data, function () {
        // wait until successful to destroy
        destroyCookie("ahoy_track");
        setReady();
      });
    } else {
      log("Cookies disabled");
      setReady();
    }
  }
}

ahoy.getVisitId = ahoy.getVisitToken = function () {
  return getCookie("ahoy_visit");
};

ahoy.getVisitorId = ahoy.getVisitorToken = function () {
  return getCookie("ahoy_visitor");
};

ahoy.track = function (name, properties) {
  // generate unique id
  const event = {
    name: name,
    properties: properties || {},
    time: (new Date()).getTime() / 1000.0,
    id: generateId(),
    js: true
  };

  ahoy.ready(function () {
    if (config.cookies && !ahoy.getVisitId()) {
      createVisit();
    }

    ahoy.ready(function () {
      log(event);

      event.visit_token = ahoy.getVisitId();
      event.visitor_token = ahoy.getVisitorId();

      if (canTrackNow()) {
        trackEventNow(event);
      } else {
        eventQueue.push(event);
        saveEventQueue();

        // wait in case navigating to reduce duplicate events
        setTimeout(function () {
          trackEvent(event);
        }, 1000);
      }
    });
  });

  return true;
};

ahoy.trackView = function (additionalProperties) {
  const properties = {
    url: window.location.href,
    title: document.title,
    page: page()
  };

  if (additionalProperties) {
    for (const propName in additionalProperties) {
      if (Object.prototype.hasOwnProperty.call(additionalProperties, propName)) {
        properties[propName] = additionalProperties[propName];
      }
    }
  }
  ahoy.track("$view", properties);
};

// push events from queue
try {
  eventQueue = JSON.parse(getCookie("ahoy_events") || "[]");
} catch (e) {
  // do nothing
}

for (let i = 0; i < eventQueue.length; i++) {
  trackEvent(eventQueue[i]);
}

ahoy.start = function () {
  createVisit();

  ahoy.start = function () { };
};

documentReady(function () {
  if (config.startOnReady) {
    ahoy.start();
  }
});

export default ahoy;
