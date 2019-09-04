const DP_DEV_HOST = 'dinopark.k8s.dev.sso.allizom.org';
const DP_TEST_HOST = 'dinopark.k8s.test.sso.allizom.org';
const DP_PROD_HOST = 'people.mozilla.org';
const DP_HOST_NAMES = [DP_DEV_HOST, DP_TEST_HOST, DP_PROD_HOST];
const DP_DEV_PATTERN = `https://${DP_DEV_HOST}/*`;
const DP_TEST_PATTERN = `https://${DP_TEST_HOST}/*`;
const DP_PROD_PATTERN = `https://${DP_PROD_HOST}/*`;
const DP_PATTERN = [DP_DEV_PATTERN, DP_TEST_PATTERN, DP_PROD_PATTERN];
const FRONT_END_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/(.*.js|css|img).*/;
const GRAPHQL_PATTERN = /.*api\/v4\/graphql.*/;
const BLACK_LIST = [
  'content-security-policy',
  'x-content-type-options',
  'strict-transport-security',
  'x-xss-protection',
];

let enabled = false;
let dataToWrite = {
  firstName: {
    value: null,
  },
  lastName: {
    value: null,
  },
  uris: {
    values: null,
  },
};

async function redirect(requestDetails) {
  if (requestDetails.url.match(GRAPHQL_PATTERN)) {
    let filter = browser.webRequest.filterResponseData(
      requestDetails.requestId
    );
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    let completeData = '';
    filter.ondata = (event) => {
      const str = decoder.decode(event.data, { stream: true });
      completeData += str;
    };
    filter.onstop = (event) => {
      const dataJSON = JSON.parse(completeData);
      const {
        data: { profile },
      } = dataJSON;
      // Write new data here
      for (let key in dataJSON.data.profile) {
        if (
          !dataJSON.data.profile.hasOwnProperty(key) ||
          !dataToWrite.hasOwnProperty(key) ||
          dataToWrite[key].value === null
        ) {
          continue;
        }
        if (dataToWrite[key].hasOwnProperty('values')) {
          dataJSON.data.profile[key].values = dataToWrite[key].values;
        } else {
          dataJSON.data.profile[key].value = dataToWrite[key].value;
        }
      }
      filter.write(encoder.encode(JSON.stringify(dataJSON)));
      filter.disconnect();
    };
  }
  if (requestDetails.url.match(FRONT_END_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.hostname = 'localhost';
    url.port = 8080;
    console.log(`Redirecting: ${requestDetails.url} → ${url.toString()}`);

    return { redirectUrl: url.toString() };
  }
}

async function unsecure(e) {
  const url = new URL(e.url);
  if (DP_HOST_NAMES.includes(url.hostname)) {
    const h = e.responseHeaders;
    const orgCsp = h.find((h) => h.name === 'content-security-policy');
    if (orgCsp) {
      const filtered = h.filter((h) => !BLACK_LIST.includes(h.name));
      return { responseHeaders: filtered };
    }
  }
}

function fixJs(details) {
  if (details.type === 'main_frame') {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder('utf-8');

    filter.ondata = (event) => {
      let str = decoder.decode(event.data, { stream: true });
      str = str.replace(/\/js\/app[A-Za-z0-9\-\.]*\.js/g, '/js/app.js');
      str = str.replace(
        /\/js\/chunk-vendors[A-Za-z0-9\-\.]*\.js/g,
        '/js/chunk-vendors.js'
      );
      filter.write(encoder.encode(str));
      filter.disconnect();
    };
  }
}

function enable() {
  enabled = true;
  browser.browserAction.setIcon({ path: { '64': 'icons/batman-xxl.png' } });
  browser.webRequest.onBeforeRequest.addListener(fixJs, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onBeforeRequest.addListener(
    redirect,
    { urls: DP_PATTERN },
    ['blocking']
  );

  browser.webRequest.onHeadersReceived.addListener(
    unsecure,
    { urls: DP_PATTERN },
    ['blocking', 'responseHeaders']
  );
}

function disable() {
  browser.webRequest.onBeforeRequest.removeListener(fixJs);

  browser.webRequest.onBeforeRequest.removeListener(redirect);

  browser.webRequest.onHeadersReceived.removeListener(unsecure);
  enabled = false;
  browser.browserAction.setIcon({
    path: { '64': 'icons/hollow-bat-symbol.png' },
  });
  console.log('disabled');
}

function getEnabled() {
  return enabled;
}

function copyFormToData(form) {
  for (let key in dataToWrite) {
    if (key in form) {
      if (dataToWrite[key].hasOwnProperty('values')) {
        dataToWrite[key].values = form[key];
      } else {
        dataToWrite[key].value = form[key];
      }
    }
  }
}

function resetForm() {
  for (let key in dataToWrite) {
    if (key in dataToWrite) {
      dataToWrite[key].value = null;
    }
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.hasOwnProperty('enabled')) {
    enabled = message.enabled === 'true';
    if (enabled) {
      enable();
      console.log('Enabling!');
    } else {
      disable();
      console.log('Disabling!');
    }
  }
  if (message.hasOwnProperty('form')) {
    copyFormToData(message.form);
  }
  if (message.hasOwnProperty('resetForm')) {
    resetForm();
  }
});
