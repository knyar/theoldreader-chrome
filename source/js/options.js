// vim: set ts=2 sw=2 et
import "./lib/browser-polyfill.js";
import { getSettings, setSettings, saveToSync, migrateFromLocalStorage } from "./storage.js";

const FADE_DELAY = 2000;

const $ = (selector) => document.querySelector(selector);

function getBrowserName() {
  // Credit to https://github.com/mozilla/webextension-polyfill/issues/55#issuecomment-329676034 since polyfill makes old "check if browser is defined impossible"
  if (browser.runtime.id === 'theoldreader@knyar') {
    return 'Mozilla';
  } else {
    return 'Chrome';
  }
}

async function save_options() {
  if (!validate_options()) return;

  const settings = {
    click_page: $('#click_page').value,
    show_notifications: $('#show_notifications').checked ? 'yes' : 'no',
    notification_timeout: String(parseInt($('#notification_timeout').value)),
    force_http: $('#force_http').checked ? 'yes' : 'no',
    prefer_pinned_tab: $('#prefer_pinned_tab').checked ? 'yes' : 'no',
    refresh_interval: String(parseInt($('#refresh_interval').value)),
    use_sync: $('#use_sync').checked ? 'yes' : 'no',
    context_menu: $('#context_menu').checked ? 'yes' : 'no',
  };

  // The background script reacts to these changes (context menus, refresh schedule)
  await setSettings(settings);

  show_message({text: browser.i18n.getMessage('optionsSaved_success'), fade_in: true, fade_out: true});

  if (settings.use_sync != "no") {
    syncCallback(await saveToSync());
  }
}

function syncCallback(result) {
  if (result === true) {
    show_message({text: browser.i18n.getMessage('optionsSaved_successAndSync'), fade_in: true, fade_out: true});
  } else {
    show_message({text: browser.i18n.getMessage('optionsSaved_successButSyncRetry'), fade_in: true, red: true});
  }
}

function validate_options() {
  const errors = [];

  // First check required to filter non-numbers
  const notificationTimeout = $('#notification_timeout').value;
  if (notificationTimeout === "" || parseInt(notificationTimeout) < 0) {
    errors.push($('#notification_timeout').closest('p'));
  }
  const refreshInterval = $('#refresh_interval').value;
  if (refreshInterval === "" || parseInt(refreshInterval) < 5) {
    errors.push($('#refresh_interval').closest('p'));
  }

  if (errors.length) {
    show_message({text: browser.i18n.getMessage('optionsValidation_correctInvalid'), red: true, fade_in: true, fade_out: true});
    // Highlight the invalid fields; the fade is a CSS transition
    for (const element of errors) {
      element.classList.add('error');
      setTimeout(() => element.classList.remove('error'), FADE_DELAY);
    }
    return false;
  } else {
    return true;
  }
}

async function load_options() {
  const settings = await getSettings();

  $('#click_page').value = settings.click_page;
  $('#show_notifications').checked = (settings.show_notifications == 'yes');
  $('#prefer_pinned_tab').checked = (settings.prefer_pinned_tab == 'yes');
  $('#notification_timeout').value = settings.notification_timeout;
  $('#force_http').checked = (settings.force_http == 'yes');
  $('#refresh_interval').value = settings.refresh_interval;
  $('#use_sync').checked = (settings.use_sync != 'no');
  $('#context_menu').checked = (settings.context_menu != 'no');
  $('#notification_timeout').closest('.subitem').hidden = (settings.show_notifications != 'yes');
}

async function onMessageOptions(request) {
  if (request.update) {
    await load_options();
    let syncServiceName;
    switch (getBrowserName()) {
      case 'Mozilla':
        syncServiceName = browser.i18n.getMessage('syncService_firefox_name');
        break;
      case 'Chrome':
      default:
        syncServiceName = browser.i18n.getMessage('syncService_chrome_name');
    }
    show_message({text: browser.i18n.getMessage('optionsUpdateFromSync', syncServiceName), fade_in: true, fade_out: true});
  }
}

let messageTimer = null;

// message is an object:
//   text ( string )
//   red ( optional boolean )
//   fade_in ( optional boolean )
//   fade_out ( optional boolean )
function show_message(message) {
  const element = $('#message');

  // Cancel any running fade and hide immediately
  clearTimeout(messageTimer);
  element.classList.add('no-transition');
  element.classList.remove('visible');
  void element.offsetWidth; // apply the hidden state before fading in again

  element.textContent = message.text;
  element.classList.toggle('red', !!message.red);
  element.classList.toggle('green', !message.red);

  element.classList.toggle('no-transition', !message.fade_in);
  element.classList.add('visible');

  if (message.fade_out) {
    messageTimer = setTimeout(() => {
      element.classList.remove('no-transition');
      element.classList.remove('visible');
    }, FADE_DELAY);
  }
}

function openChromeSyncSettings(e) {
  // A simple link would not work, but browser.tabs sidesteps restrictions
  browser.tabs.create({url: "chrome://settings/syncSetup"});
  e.preventDefault();
}

function displaySyncSettingsLink() {
  const link = $('#open_sync_settings');
  switch (getBrowserName()) {
    case 'Mozilla':
      link.textContent = browser.i18n.getMessage('syncService_firefox_name');
      link.href = 'https://support.mozilla.org/kb/how-do-i-choose-what-information-sync-firefox';
      link.classList.add('extlink');
      break;
    case 'Chrome':
    default:
      link.textContent = browser.i18n.getMessage('syncService_chrome_name');
      link.addEventListener('click', openChromeSyncSettings);
  }
}

function showReviewsLink() {
  const link = $('#reviewsLink');
  switch (getBrowserName()) {
    case 'Mozilla':
      link.textContent = browser.i18n.getMessage('rateLink_firefox');
      link.href = 'https://addons.mozilla.org/addon/the-old-reader-notifier-webext/reviews';
      break;
    case 'Chrome':
    default:
      link.textContent = browser.i18n.getMessage('rateLink_chrome');
      link.href = 'https://chrome.google.com/webstore/detail/the-old-reader-notifier/flnadglecinohkbmdpeooblldjpaimpo/reviews';
  }
}

function toggleChangelog(e) {
  e.preventDefault();
  for (const element of document.querySelectorAll('.container:not(#changelogContainer)')) {
    element.classList.toggle('invisible');
  }
  $('#changelogContainer').classList.toggle('invisible');
  $('#changelogLink').classList.toggle('invisible');
  $('#changelogHideLink').classList.toggle('invisible');
}

async function init() {
  // i18n
  for (let element of document.querySelectorAll('[data-i18n-id]')) {
    element.textContent = browser.i18n.getMessage(element.dataset.i18nId);
  }

  showReviewsLink();
  // Settings saved by versions <= 1.5.3 in localStorage; the Chrome service
  // worker cannot read them, but this page can.
  await migrateFromLocalStorage();
  await load_options();

  fetch('ChangeLog').then(function(response) {
    return response.text();
  }).then(function(text) {
    $('#changelogText').textContent = text;
  });

  $('#changelogLink').addEventListener('click', toggleChangelog);
  $('#changelogHideLink').addEventListener('click', toggleChangelog);

  // Bind click handlers
  $('#save_button').addEventListener('click', save_options);
  displaySyncSettingsLink();

  // Reminder to save from dirty state
  for (const element of document.querySelectorAll('input, select')) {
    element.addEventListener('change', function() {
      show_message({text: browser.i18n.getMessage('saveButton_clickMessage'), red: true});
    });
  }

  // Show/hide subitem
  $('#show_notifications').addEventListener('click', function() {
    $('#notification_timeout').closest('.subitem').hidden = !$('#show_notifications').checked;
  });

  browser.runtime.onMessage.addListener(onMessageOptions);
}

// Module scripts run after the document is parsed, so the DOM is ready here
init();
