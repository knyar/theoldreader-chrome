// vim: set ts=2 sw=2 et
var ERROR_BACKGROUND_COLOR = '#ffbbbb';
var FADE_DELAY = 2000;

function save_options() {
  if(!validate_options()) return;
  
  localStorage['click_page'] = $('#click_page').val();
  localStorage['show_notifications'] = $('#show_notifications').prop('checked') ? 'yes' : 'no';
  localStorage['notification_timeout'] = parseInt($('#notification_timeout').val());
  localStorage['prefer_https'] = $('#prefer_https').prop('checked') ? 'yes' : 'no';
  localStorage['prefer_pinned_tab'] = $('#prefer_pinned_tab').prop('checked') ? 'yes' : 'no';
  localStorage['refresh_interval'] = parseInt($('#refresh_interval').val());
  localStorage['use_sync'] = $('#use_sync').prop('checked') ? 'yes' : 'no';
  localStorage['context_menu'] = $('#context_menu').prop('checked') ? 'yes' : 'no';
  
  show_message({text : "Options saved!", fade_in : true, fade_out : true});
  
  if (localStorage["use_sync"] != "no") {
    chrome.runtime.sendMessage({'sync' : true}, syncCallback);
  }

  // According to the current state, enable or disable the context menus
  chrome.runtime.sendMessage({'toggleContextMenus' : true});
}

function syncCallback(result) {
  if (result === true) {
    show_message({text : "Options saved and will be synced!", fade_in : true, fade_out : true});
  } else if (result === false) {
    show_message({text : "Options saved, but sync failed. Will retry in a minute.", fade_in : true, red : true});
  } else if (chrome.runtime.lastError) {
    console.error("Could not communicate with the extension!", chrome.runtime.lastError.message);
  }
}

function validate_options() {
  var errors = $();
  
  // First check required to filter non-numbers
  if ($('#notification_timeout').val() === "" || parseInt($('#notification_timeout').val()) < 0) {
    errors = errors.add($('#notification_timeout').closest('p'));
  }
  if ($('#refresh_interval').val() === "" || parseInt($('#refresh_interval').val()) < 5) {
    errors = errors.add($('#refresh_interval').closest('p'));
  }
  
  if (errors.length) {
    show_message({text : "Please correct these values!", red : true, fade_in : true, fade_out : true});
    errors.animate({ backgroundColor : ERROR_BACKGROUND_COLOR}, 'fast').delay(FADE_DELAY).animate({ backgroundColor : 'none'}, 'fast');
    return false;
  } else {
    return true;
  }
}

function load_options() {
  if (localStorage['click_page']) {
    $('#click_page').val(localStorage['click_page']);
  }
  if (localStorage['show_notifications'] == 'yes') {
    $('#show_notifications').prop('checked', true);
  }
  if (localStorage['prefer_pinned_tab'] == 'yes') {
    $('#prefer_pinned_tab').prop('checked', true);
  }
  $('#notification_timeout').val(localStorage['notification_timeout'] || 0);
  if (localStorage['prefer_https'] == 'yes') {
    $('#prefer_https').prop('checked', true);
  }
  $('#refresh_interval').val(localStorage['refresh_interval'] || 15);
  if (localStorage['use_sync'] != 'no') {
    $('#use_sync').prop('checked', true);
  }
  if (localStorage['context_menu'] != 'no') {
    $('#context_menu').prop('checked', true);
  }
}

function onMessageOptions(request, sender, callback) {
  if (request.update) {
    load_options();
    show_message({text : "Options updated from Chrome Sync.", fade_in : true, fade_out : true});
  }
}

// message is an object:
//   text ( string )
//   red ( optional boolean )
//   fade_in ( optional boolean ) 
//   fade_out ( optional boolean )
function show_message(message) {
  $('#message').finish().hide();
  $('#message').text(message.text).toggleClass("red", message.red || false);
  
  if (message.fade_in) {
    $('#message').fadeIn('fast');
  } else {
    $('#message').show();
  }
  
  if (message.fade_out) {
    $('#message').delay(FADE_DELAY).fadeOut('fast');
  }
}

$(document).ready(function() {
  $('#save_button').click(function() {
    save_options();
    return false;
  });
  $('input,select').change(function() {
    show_message({text : "< Click button to save your changes", red : true});
  });
  $('#notification_timeout').closest('.subitem').toggle(localStorage['show_notifications'] == 'yes');
  $('#show_notifications').click(function() {
    if ($('#show_notifications').prop('checked')) {
      $('#notification_timeout').closest('.subitem').slideDown('fast');
    } else {
      $('#notification_timeout').closest('.subitem').slideUp('fast');
    }
  });

  chrome.runtime.onMessage.addListener(onMessageOptions);
});

document.addEventListener('DOMContentLoaded', load_options);
