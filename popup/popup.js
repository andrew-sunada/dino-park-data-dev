let enabled = false;

function toggleDataListener(e) {
  const header = document.getElementById('dp-header');
  const toggleButton = document.getElementById('toggle-button');
  if (!enabled) {
    console.log('Enabling');
    enabled = true;
    header.classList.add('active');
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-secondary');
    toggleButton.innerHTML = 'Deactivate';
    browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
    browser.runtime.sendMessage({ enabled: 'true' });
  } else {
    console.log('Disabling');
    enabled = false;
    header.classList.remove('active');
    toggleButton.classList.remove('btn-secondary');
    toggleButton.classList.add('btn-primary');
    toggleButton.innerHTML = 'Activate';
    browser.browserAction.setIcon({ path: { '64': '../icons/hollow-bat-symbol.png' } });
    browser.runtime.sendMessage({ enabled: 'false' });
  }
}

function resetForm() {
  browser.runtime.sendMessage({ resetForm: 'true' });
}

function addChildList(itemContainer) {
  const itemLabel = itemContainer.querySelector('label');
  const itemValue = itemContainer.querySelector('input[type="hidden"]');
  const labelFor = itemLabel.getAttribute('for');
  let map = {};
  if (itemValue.value !== '') {
    map = JSON.parse(itemValue.value);
  }
  const newLabel = itemContainer.querySelector('.child-form__label-input').value;
  const newValue = itemContainer.querySelector('.child-form__value-input').value;
  map[newLabel] = newValue;
  itemValue.value = JSON.stringify(map);
}

let getting = browser.runtime.getBackgroundPage();
getting.then(
  page => {
    enabled = page.getEnabled();
    const header = document.getElementById('dp-header');
    if (enabled) {
      header.classList.add('active');
      browser.browserAction.setIcon({ path: { '64': '../icons/batman-xxl.png' } });
    } else {
      header.classList.remove('active');
      browser.browserAction.setIcon({ path: { '64': '../icons/hollow-bat-symbol.png' } });
    }
  },
  error => {
    console.log('Error: ', error);
  }
);

const toggleButton = document.getElementById('toggle-button');
toggleButton.onclick = toggleDataListener;
const resetButton = document.getElementById('reset-form');
resetButton.onclick = resetForm;
const form = document.getElementById('data-form');
form.onsubmit = function(event) {
  const form = event.target;
  const sendable = {};
  for (let key in form) {
    if (!form.hasOwnProperty(key) || form[key].type === 'button') {
      continue;
    }
    if (form[key].type === 'hidden') {
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
