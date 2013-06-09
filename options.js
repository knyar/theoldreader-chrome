// vim: set ts=2 sw=2 et
function save_options() {
  localStorage['click_page'] = $('#click_page').val();
  localStorage['show_notifications'] = $('#show_notifications').prop('checked') ? 'yes' : 'no';
  localStorage['notification_timeout'] = parseInt($('#notification_timeout').val());
  localStorage['prefer_https'] = $('#prefer_https').prop('checked') ? 'yes' : 'no';
  $('#save_notification').fadeIn('fast').delay(2000).fadeOut('fast');
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
}

$(document).ready(function() {
  $('#save_button').click(function() {
    save_options();
    return false;
  });
});

document.addEventListener('DOMContentLoaded', load_options);
