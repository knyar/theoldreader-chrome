// vim: set ts=2 sw=2 et
const ERROR_BACKGROUND_COLOR = '#ffbbbb';
const FADE_DELAY = 2000;

function getBrowserName() {
  if (typeof browser !== 'undefined') {
    return 'Mozilla';
  } else {
    return 'Chrome';
  }
}

function save_options() {
  if (!validate_options()) return;

  localStorage.click_page = $('#click_page').val();
  localStorage.show_notifications = $('#show_notifications').prop('checked') ? 'yes' : 'no';
  localStorage.notification_timeout = parseInt($('#notification_timeout').val());
  localStorage.force_http = $('#force_http').prop('checked') ? 'yes' : 'no';
  localStorage.prefer_pinned_tab = $('#prefer_pinned_tab').prop('checked') ? 'yes' : 'no';
  localStorage.refresh_interval = parseInt($('#refresh_interval').val());
  localStorage.use_sync = $('#use_sync').prop('checked') ? 'yes' : 'no';
  localStorage.context_menu = $('#context_menu').prop('checked') ? 'yes' : 'no';

  show_message({text: chrome.i18n.getMessage('optionsSaved_success'), fade_in: true, fade_out: true});

  if (localStorage.use_sync != "no") {
    chrome.runtime.sendMessage({sync: true}, syncCallback);
  }

  // According to the current state, enable or disable the context menus
  chrome.runtime.sendMessage({toggleContextMenus: true});
}

function syncCallback(result) {
  if (result === true) {
    show_message({text: chrome.i18n.getMessage('optionsSaved_successAndSync'), fade_in: true, fade_out: true});
  } else if (result === false) {
    show_message({text: chrome.i18n.getMessage('optionsSaved_successButSyncRetry'), fade_in: true, red: true});
  } else if (chrome.runtime.lastError) {
    console.error("Could not communicate with the extension!", chrome.runtime.lastError.message);
  }
}

function validate_options() {
  let errors = $();

  // First check required to filter non-numbers
  if ($('#notification_timeout').val() === "" || parseInt($('#notification_timeout').val()) < 0) {
    errors = errors.add($('#notification_timeout').closest('p'));
  }
  if ($('#refresh_interval').val() === "" || parseInt($('#refresh_interval').val()) < 5) {
    errors = errors.add($('#refresh_interval').closest('p'));
  }

  if (errors.length) {
    show_message({text: chrome.i18n.getMessage('optionsValidation_correctInvalid'), red: true, fade_in: true, fade_out: true});
    errors.animate({ backgroundColor: ERROR_BACKGROUND_COLOR}, 'fast').delay(FADE_DELAY).animate({ backgroundColor: 'none'}, 'fast');
    return false;
  } else {
    return true;
  }
}

function load_options() {
  if (localStorage.click_page) {
    $('#click_page').val(localStorage.click_page);
  }
  $('#show_notifications').prop('checked', (localStorage.show_notifications == 'yes'));
  $('#prefer_pinned_tab').prop('checked', (localStorage.prefer_pinned_tab == 'yes'));
  $('#notification_timeout').val(localStorage.notification_timeout || 0);
  $('#force_http').prop('checked', (localStorage.force_http == 'yes'));
  $('#refresh_interval').val(localStorage.refresh_interval || 15);
  $('#use_sync').prop('checked', (localStorage.use_sync != 'no'));
  $('#context_menu').prop('checked', (localStorage.context_menu != 'no'));
}

function onMessageOptions(request) {
  if (request.update) {
    load_options();
    let syncServiceName;
    switch (getBrowserName()) {
      case 'Mozilla':
        syncServiceName = chrome.i18n.getMessage('syncService_firefox_name');
        break;
      case 'Chrome':
      default:
        syncServiceName = chrome.i18n.getMessage('syncService_chrome_name');
    }
    show_message({text: chrome.i18n.getMessage('optionsUpdateFromSync', syncServiceName), fade_in: true, fade_out: true});
  }
}

// message is an object:
//   text ( string )
//   red ( optional boolean )
//   fade_in ( optional boolean ) 
//   fade_out ( optional boolean )
function show_message(message) {
  $('#message').finish().hide();
  $('#message').text(message.text);
  $('#message').toggleClass("red", message.red);
  $('#message').toggleClass("green", !message.red);

  if (message.fade_in) {
    $('#message').fadeIn('fast');
  } else {
    $('#message').show();
  }

  if (message.fade_out) {
    $('#message').delay(FADE_DELAY).fadeOut('fast');
  }
}

function openChromeSyncSettings(e) {
  // A simple link would not work, but chrome.tabs sidesteps restrictions
  chrome.tabs.create({url: "chrome://settings/syncSetup"});
  e.preventDefault();
}

function displaySyncSettingsLink() {
  switch (getBrowserName()) {
    case 'Mozilla':
      $('#open_sync_settings').text(chrome.i18n.getMessage('syncService_firefox_name'));
      $('#open_sync_settings').attr('href', 'https://support.mozilla.org/kb/how-do-i-choose-what-types-information-sync-firefox');
      $('#open_sync_settings').addClass('extlink');
      break;
    case 'Chrome':
    default:
      $('#open_sync_settings').text(chrome.i18n.getMessage('syncService_chrome_name'));
      $('#open_sync_settings').click(openChromeSyncSettings);
  }
}

function showReviewsLink() {
  switch (getBrowserName()) {
    case 'Mozilla':
      $('#reviewsLink').text(chrome.i18n.getMessage('rateLink_firefox'));
      $('#reviewsLink').attr('href', 'https://addons.mozilla.org/addon/the-old-reader-notifier-webext/reviews');
      break;
    case 'Chrome':
    default:
      $('#reviewsLink').text(chrome.i18n.getMessage('rateLink_chrome'));
      $('#reviewsLink').attr('href', 'https://chrome.google.com/webstore/detail/the-old-reader-notifier/flnadglecinohkbmdpeooblldjpaimpo/reviews');
  }
}

function toggleChangelog(e) {
  e.preventDefault();
  $(".container").not("#changelogContainer").toggleClass('invisible');
  $("#changelogContainer").toggleClass('invisible');
  $("#changelogLink").toggleClass('invisible');
  $("#changelogHideLink").toggleClass('invisible');
}

$(document).ready(function() {
  // i18n
  for (let element of document.querySelectorAll('[data-i18n-id]')) {
    element.textContent = chrome.i18n.getMessage(element.dataset.i18nId);
  }

  showReviewsLink();
  load_options();

  fetch('ChangeLog').then(function(response) {
    return response.text();
  }).then(function(text) {
    $("#changelogText").text(text);
  });

  $("#optionsContainer").show();

  $("#changelogLink").click(toggleChangelog);

  $("#changelogHideLink").click(toggleChangelog);

  // Bind click handlers
  $('#save_button').click(save_options);
  displaySyncSettingsLink();

  // Reminder to save from dirty state
  $('input,select').change(function() {
    show_message({text: chrome.i18n.getMessage('saveButton_clickMessage'), red: true});
  });

  // Show/animate subitem
  $('#notification_timeout').closest('.subitem').toggle(localStorage.show_notifications == 'yes');
  $('#show_notifications').click(function() {
    if ($('#show_notifications').prop('checked')) {
      $('#notification_timeout').closest('.subitem').slideDown('fast');
    } else {
      $('#notification_timeout').closest('.subitem').slideUp('fast');
    }
  });

  chrome.runtime.onMessage.addListener(onMessageOptions);
});
