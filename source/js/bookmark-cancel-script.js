let cancelButton = document.querySelector('.bookmark-btns > a[href^="javascript:window.close()"]');
if (cancelButton) {
  cancelButton.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({type: 'close-this-tab'});
  });
}
