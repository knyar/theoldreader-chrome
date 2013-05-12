function save_options() {
	localStorage['click_page'] = $('#click_page').val();
	$('#save_notification').fadeIn('fast').delay(2000).fadeOut('fast');
}

function load_options() {
	if (localStorage['click_page']) {
		$('#click_page').val(localStorage['click_page']);
	}
}

$(document).ready(function() {
	$('#save_button').click(function() {
		save_options();
		return false;
	});
});

document.addEventListener('DOMContentLoaded', load_options);
