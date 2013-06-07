function save_options() {
	localStorage['click_page'] = $('#click_page').val();
	localStorage['show_notifications'] = $('#show_notifications').prop('checked');
	$('#save_notification').fadeIn('fast').delay(2000).fadeOut('fast');
}

function load_options() {
	if (localStorage['click_page']) {
		$('#click_page').val(localStorage['click_page']);
	}
	if (localStorage['show_notifications']) {
		$('#show_notifications').prop('checked', true);
	}
}

$(document).ready(function() {
	$('#save_button').click(function() {
		save_options();
		return false;
	});
});

document.addEventListener('DOMContentLoaded', load_options);
