window.addEventListener("load", function() {
  if (window.webkitIntent) {
    window.location = 'http://theoldreader.com/feeds/subscribe?url=' + window.webkitIntent.data
  }
}, false);
