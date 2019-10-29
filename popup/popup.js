/**
 * TODO: Split this out to enable FE, BE, Graphql separately
 */

const FE_BUTTON_ID = 'toggle-fe-button';
const BE_BUTTON_ID = 'toggle-be-button';
const GRAPHQL_BUTTON_ID = 'toggle-graphql-button';
const FE_KEY = 'fe_enabled';
const BE_KEY = 'be_enabled';
const GRAPHQL_KEY = 'graphql_enabled';
let enabled = {
  [FE_KEY]: false,
  [BE_KEY]: false,
  [GRAPHQL_KEY]: false,
};

const BE_TEXT = 'BE';
const FE_TEXT = 'FE';
const GRAPHQL_TEXT = 'GraphQL';
const ACTIVATE_TEXT = 'Activate';
const DEACTIVATE_TEXT = 'Deactivate';

function toggleBEListener(e) {
  const header = document.getElementById('dp-header');
  const toggleButton = document.getElementById(BE_BUTTON_ID);
  if (!enabled[BE_KEY]) {
    console.log('Enabling be');
    enabled[BE_KEY] = true;
    header.classList.add('active');
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-secondary');
    toggleButton.innerHTML = `${DEACTIVATE_TEXT} ${BE_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
    browser.runtime.sendMessage({ [BE_KEY]: 'true' });
  } else {
    console.log('Disabling be');
    enabled[BE_KEY] = false;
    header.classList.remove('active');
    toggleButton.classList.remove('btn-secondary');
    toggleButton.classList.add('btn-primary');
    toggleButton.innerHTML = `${ACTIVATE_TEXT} ${BE_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/hollow-bat-symbol.png' } });
    browser.runtime.sendMessage({ [BE_KEY]: 'false' });
  }
}

function toggleFEListener(e) {
  const header = document.getElementById('dp-header');
  const toggleButton = document.getElementById(FE_BUTTON_ID);
  if (!enabled[FE_KEY]) {
    console.log('Enabling fe');
    enabled[FE_KEY] = true;
    header.classList.add('active');
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-secondary');
    toggleButton.innerHTML = `${DEACTIVATE_TEXT} ${FE_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
    browser.runtime.sendMessage({ [FE_KEY]: 'true' });
  } else {
    console.log('Disabling fe');
    enabled[FE_KEY] = false;
    header.classList.remove('active');
    toggleButton.classList.remove('btn-secondary');
    toggleButton.classList.add('btn-primary');
    toggleButton.innerHTML = `${ACTIVATE_TEXT} ${FE_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/hollow-bat-symbol.png' } });
    browser.runtime.sendMessage({ [FE_KEY]: 'false' });
  }
}

function toggleGraphQLListener(e) {
  const header = document.getElementById('dp-header');
  const toggleButton = document.getElementById(GRAPHQL_BUTTON_ID);
  if (!enabled[GRAPHQL_KEY]) {
    console.log('Enabling graphql');
    enabled[GRAPHQL_KEY] = true;
    header.classList.add('active');
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-secondary');
    toggleButton.innerHTML = `${DEACTIVATE_TEXT} ${GRAPHQL_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
    browser.runtime.sendMessage({ [GRAPHQL_KEY]: 'true' });
  } else {
    console.log('Disabling graphql');
    enabled[GRAPHQL_KEY] = false;
    header.classList.remove('active');
    toggleButton.classList.remove('btn-secondary');
    toggleButton.classList.add('btn-primary');
    toggleButton.innerHTML = `${ACTIVATE_TEXT} ${GRAPHQL_TEXT}`;
    // browser.browserAction.setIcon({ path: { '64': '../icons/hollow-bat-symbol.png' } });
    browser.runtime.sendMessage({ [GRAPHQL_KEY]: 'false' });
  }
}

function resetForm() {
  browser.runtime.sendMessage({ resetForm: 'true' });
}

function addChildList(itemContainer) {
  const itemLi = document.createElement('li');
  const newLabelEl = document.createElement('label');
  const newValueEl = document.createElement('span');
  const itemList = itemContainer.querySelector('.data-form__child-rows');
  const itemLabel = itemContainer.querySelector('label');
  const itemValue = itemContainer.querySelector('input[type="hidden"]');
  const labelFor = itemLabel.getAttribute('for');
  let map = {};
  if (itemValue.value !== '') {
    map = JSON.parse(itemValue.value);
  }
  const newLabel = itemContainer.querySelector('.child-form__label-input');
  const newValue = itemContainer.querySelector('.child-form__value-input');
  map[newLabel.value] = newValue.value;
  itemValue.value = JSON.stringify(map);
  newLabelEl.innerHTML = newLabel.value;
  newValueEl.innerHTML = newValue.value;
  newLabel.value = '';
  newValue.value = '';
  itemLi.appendChild(newLabelEl);
  itemLi.appendChild(newValueEl);
  itemList.appendChild(itemLi);
}

const toggleFEButton = document.getElementById(FE_BUTTON_ID);
toggleFEButton.onclick = toggleFEListener;
const toggleBEButton = document.getElementById(BE_BUTTON_ID);
toggleBEButton.onclick = toggleBEListener;
const toggleGraphQLButton = document.getElementById(GRAPHQL_BUTTON_ID);
toggleGraphQLButton.onclick = toggleGraphQLListener;

let getting = browser.runtime.getBackgroundPage();
getting.then(
  page => {
    enabled = page.getEnabled();
    console.log('Enabled: ', enabled);
    const header = document.getElementById('dp-header');
    for (let key in enabled) {
      let toggleButton = null;
      let innerText = '';
      if (!enabled.hasOwnProperty(key) || !enabled[key]) {
        continue;
      }
      if (key === FE_KEY) {
        toggleButton = toggleFEButton;
        innerText = `${DEACTIVATE_TEXT} ${FE_TEXT}`;
      } else if (key === BE_KEY) {
        toggleButton = toggleBEButton;
        innerText = `${DEACTIVATE_TEXT} ${BE_TEXT}`;
      } else if (key === GRAPHQL_KEY) {
        toggleButton = toggleGraphQLButton;
        innerText = `${DEACTIVATE_TEXT} ${GRAPHQL_TEXT}`;
      }
      if (toggleButton !== null) {
        header.classList.add('active');
        toggleButton.innerHTML = innerText;
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-secondary');
        browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
      }
    }
  },
  error => {
    console.log('Error: ', error);
  }
);

const resetButton = document.getElementById('reset-form');
resetButton.onclick = resetForm;
const form = document.getElementById('data-form');
console.log('Running popup.js');
form.onsubmit = function(event) {
  const form = event.target;
  const sendable = {};
  for (let key in form) {
    if (!form.hasOwnProperty(key) || form[key].type === 'button') {
      continue;
    }
    if (form[key].type === 'hidden' && form[key].value) {
      sendable[form[key].name] = JSON.parse(form[key].value);
    } else if (form[key].getAttribute('name')) {
      sendable[form[key].name] = form[key].value;
    }
  }
  browser.runtime.sendMessage({ form: sendable });
  event.preventDefault();
};

const childSubmitButtons = document.getElementsByClassName('child-form__submit');
for (let csButton of childSubmitButtons) {
  csButton.onclick = function(e) {
    addChildList(e.target.parentNode.parentNode);
  };
}
