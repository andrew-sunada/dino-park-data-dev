const DP_DEV_HOST = 'dinopark.k8s.dev.sso.allizom.org';
const DP_TEST_HOST = 'dinopark.k8s.test.sso.allizom.org';
const DP_PROD_HOST = 'people.mozilla.org';
const DP_HOST_NAMES = [DP_DEV_HOST, DP_TEST_HOST, DP_PROD_HOST];

const DP_DEV_PATTERN = `https://${DP_DEV_HOST}/*`;
const DP_TEST_PATTERN = `https://${DP_TEST_HOST}/*`;
const DP_PROD_PATTERN = `https://${DP_PROD_HOST}/*`;
const DP_PATTERN = [DP_DEV_PATTERN, DP_TEST_PATTERN, DP_PROD_PATTERN];

const FRONT_END_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/(.*.js|css|img).*/;
const INDEX_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/[a-z]?(\/[0-9a-zA-Z-_=]*)?(\?.*)?$/;
const WHOAMI_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/whoami\/.*/;
const GRAPHQL_PATTERN = /.*api\/v4\/graphql.*/;

const BLACK_LIST = [
  'content-security-policy',
  'x-content-type-options',
  'strict-transport-security',
  'x-xss-protection',
];

const GA_CODE = `<!-- Global site tag (gtag.js) - Google Analytics -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-3919QT0M94"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());

  gtag('config', 'G-3919QT0M94');
</script>`;

const BE_KEY = 'be_enabled';
const FE_KEY = 'fe_enabled';
const GRAPHQL_KEY = 'graphql_enabled';

let enabled = {
  [BE_KEY]: false,
  [FE_KEY]: false,
  [GRAPHQL_KEY]: false,
};
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
/**
 * TODO: Make it so that you can enable FE, BE, Graphql
 */
async function redirectGraphQL(requestDetails) {
  if (requestDetails.url.match(GRAPHQL_PATTERN)) {
    console.log('Graphql pattern: ', requestDetails.url);
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    let completeData = '';
    filter.ondata = event => {
      const str = decoder.decode(event.data, { stream: true });
      completeData += str;
    };
    filter.onstop = event => {
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
          dataJSON.data.profile[key].values = Object.assign(
            dataJSON.data.profile[key].values,
            dataToWrite[key].values
          );
        } else {
          console.log(`Writing value: ${dataToWrite[key].value} to key: ${key}`);
          dataJSON.data.profile[key].value = dataToWrite[key].value;
        }
      }
      console.log('writing json: ', dataJSON);
      filter.write(encoder.encode(JSON.stringify(dataJSON)));
      filter.disconnect();
    };
  }
}

async function redirectFE(requestDetails) {
  if (requestDetails.url.match(FRONT_END_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.hostname = 'localhost';
    url.port = 8080;
    console.log(`Redirecting: ${requestDetails.url} → ${url.toString()}`);

    return { redirectUrl: url.toString() };
  }
  if (requestDetails.url.match(INDEX_PATTERN)) {
    console.log('Index pattern: ', requestDetails.url);
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder('utf-8');
    let completeData = '';
    filter.ondata = event => {
      const str = decoder.decode(event.data, { stream: true });
      completeData += str;
    };
    filter.onstop = event => {
      completeData = completeData.replace('<head>', '<head>' + GA_CODE);
      filter.write(encoder.encode(completeData));
      filter.disconnect();
    };
  }
}

async function redirectBE(requestDetails) {
  if (requestDetails.url.match(WHOAMI_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.protocol = 'http';
    // url.hostname = 'localhost';
    url.hostname = 'f5885ac7.ngrok.io';
    // url.port = 8084;
    console.log(`Redirecting ssl: ${requestDetails.url} → ${url.toString()}`);
    return { redirectUrl: url.toString() };
  }
}

async function unsecure(e) {
  const url = new URL(e.url);
  if (DP_HOST_NAMES.includes(url.hostname)) {
    const h = e.responseHeaders;
    const orgCsp = h.find(h => h.name === 'content-security-policy');
    if (orgCsp) {
      const filtered = h.filter(h => !BLACK_LIST.includes(h.name));
      return { responseHeaders: filtered };
    }
  }
}

function fixJs(details) {
  if (details.type === 'main_frame') {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();

    filter.ondata = event => {
      let str = decoder.decode(event.data, { stream: true });
      str = str.replace(/\/js\/app[A-Za-z0-9\-\.]*\.js/g, '/app.js');
      str = str.replace(
        /<script src="?\/js\/chunk\-[A-Za-z0-9\-\.]*\.js"?><\/script>/g,
        ''
      );
      filter.write(encoder.encode(str));
      filter.disconnect();
    };
  }
}

function enableFE() {
  browser.webRequest.onBeforeRequest.addListener(fixJs, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onBeforeRequest.addListener(redirectFE, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onHeadersReceived.addListener(unsecure, { urls: DP_PATTERN }, [
    'blocking',
    'responseHeaders',
  ]);
}

function enableFE() {
  browser.webRequest.onBeforeRequest.addListener(fixJs, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onBeforeRequest.addListener(redirectFE, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onHeadersReceived.addListener(unsecure, { urls: DP_PATTERN }, [
    'blocking',
    'responseHeaders',
  ]);
}

function disableFE() {
  browser.webRequest.onBeforeRequest.removeListener(fixJs);

  browser.webRequest.onBeforeRequest.removeListener(redirectFE);

  browser.webRequest.onHeadersReceived.removeListener(unsecure);
  // browser.browserAction.setIcon({ path: { '64': 'icons/hollow-bat-symbol.png' } });
  console.log('disabled');
}

function enableBE() {
  browser.webRequest.onBeforeRequest.addListener(redirectBE, { urls: DP_PATTERN }, [
    'blocking',
  ]);
}
function disableBE() {
  browser.webRequest.onBeforeRequest.removeListener(redirectBE);
}

function enableGraphQL() {
  browser.webRequest.onBeforeRequest.addListener(redirectGraphQL, { urls: DP_PATTERN }, [
    'blocking',
  ]);
}
function disableGraphQL() {
  browser.webRequest.onBeforeRequest.removeListener(redirectGraphQL);
}

function disableFE() {
  browser.webRequest.onBeforeRequest.removeListener(fixJs);

  browser.webRequest.onBeforeRequest.removeListener(redirectFE);

  browser.webRequest.onHeadersReceived.removeListener(unsecure);
  // browser.browserAction.setIcon({ path: { '64': 'icons/hollow-bat-symbol.png' } });
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
        if (form[key] !== '') {
          dataToWrite[key].value = form[key];
        }
      }
    }
  }
}

function resetForm() {
  for (let key in dataToWrite) {
    if (key in dataToWrite) {
      if (dataToWrite[key].hasOwnProperty('values')) {
        dataToWrite[key].values = null;
      } else {
        dataToWrite[key].value = null;
      }
    }
  }
}

browser.runtime.onMessage.addListener(message => {
  console.log('Found message: ', message);
  if (message.hasOwnProperty(BE_KEY)) {
    enabled[BE_KEY] = message[BE_KEY] === 'true';
    if (enabled[BE_KEY]) {
      enableBE();
      console.log('Enabling be!');
    } else {
      disableBE();
      console.log('Disabling be!');
    }
  }
  if (message.hasOwnProperty(FE_KEY)) {
    enabled[FE_KEY] = message[FE_KEY] === 'true';
    if (enabled[FE_KEY]) {
      enableFE();
      console.log('Enabling fe!');
    } else {
      disableFE();
      console.log('Disabling fe!');
    }
  }
  if (message.hasOwnProperty(GRAPHQL_KEY)) {
    enabled[GRAPHQL_KEY] = message[GRAPHQL_KEY] === 'true';
    if (enabled[GRAPHQL_KEY]) {
      enableGraphQL();
      console.log('Enabling graphql!');
    } else {
      disableGraphQL();
      console.log('Disabling graphql!');
    }
  }
  if (message.hasOwnProperty('form')) {
    copyFormToData(message.form);
  }
  if (message.hasOwnProperty('resetForm')) {
    resetForm();
  }
});
