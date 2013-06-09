// vim: set ts=2 sw=2 et
var BADGE_BACKGROUND_COLOR = '#ffbbbb';

function save_options() {
  if(!validate_options()) return;
  localStorage['click_page'] = $('#click_page').val();
  localStorage['show_notifications'] = $('#show_notifications').prop('checked') ? 'yes' : 'no';
  localStorage['notification_timeout'] = parseInt($('#notification_timeout').val());
  localStorage['prefer_https'] = $('#prefer_https').prop('checked') ? 'yes' : 'no';
  localStorage['refresh_interval'] = parseInt($('#refresh_interval').val());
  $('.message').finish().hide();
  $('#save_notification').fadeIn('fast').delay(2000).fadeOut('fast');
}

function validate_options() {
  var errors = $();
  
  // First check required to filter non-numbers
  if ($('#notification_timeout').val() === "" || parseInt($('#notification_timeout').val()) < 0) {
    errors = errors.add($('#notification_timeout').closest('p'));
  }
  if ($('#refresh_interval').val() === "" || parseInt($('#refresh_interval').val()) <= 0) {
    errors = errors.add($('#refresh_interval').closest('p'));
  }
  
  if (errors.length) {
    $('.message').finish().hide();
    $('#save_failed').fadeIn('fast').delay(2000).fadeOut('fast');
    errors.animate({ backgroundColor : BADGE_BACKGROUND_COLOR}, 'fast').delay(2000).animate({ backgroundColor : 'none'}, 'fast');
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
  $('#notification_timeout').val(localStorage['notification_timeout'] || 0);
  if (localStorage['prefer_https'] == 'yes') {
    $('#prefer_https').prop('checked', true);
  }
  $('#refresh_interval').val(localStorage['refresh_interval'] || 15);
}

$(document).ready(function() {
  $('#save_button').click(function() {
    save_options();
    return false;
  });
  $('input,select').change(function() {
    $('.message').finish().hide();
    $('#save_required').show();
  });
  $('#notification_timeout').closest('p').toggle(localStorage['show_notifications'] == 'yes');
  $('#show_notifications').click(function() {
    if ($('#show_notifications').prop('checked')) {
      $('#notification_timeout').closest('p').slideDown('fast');
    } else {
      $('#notification_timeout').closest('p').slideUp('fast');
    }
  });
});

document.addEventListener('DOMContentLoaded', load_options);
