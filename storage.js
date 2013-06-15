function loadFromStorage() {
  if (localStorage["use_sync"] == "no") { return; }

  chrome.storage.sync.get(null, function(items) {
    console.group("Populating from sync storage...");
    for (var key in items) {
      console.debug("* Setting key '" + key + "', values:", {local : localStorage[key], sync : items[key]});
      localStorage[key] = items[key]; 
    }
    console.groupEnd();
  });
}

var syncRetryTimeout;

function saveToStorage(callback) {
  if (localStorage["use_sync"] == "no") { return; }

  if (syncRetryTimeout) {
    console.log("Already waiting for a sync attempt, throttling request");
    if (callback) { callback(false); }
    return;
  }
  
  console.debug("Saving to sync storage...");
  chrome.storage.sync.set(localStorage, retryOnError(saveToStorage, callback));
}

// callback (optional function) will be called with true/false depending on success of the attempt (once)
function retryOnError(retryFunction, callback) {
  return function() {
    if (chrome.runtime.lastError) {
      console.warn("Will retry in a minute due to ", chrome.runtime.lastError.message);
      if (callback) { callback(false); }
      
      syncRetryTimeout = window.setTimeout(function() {
        syncRetryTimeout = null;
        retryFunction();
      }, 60*1000);
      
    } else {
      console.debug("# Synced successfully");
      if (callback) { callback(true); }
    }
  }
}

function onStorageChange(changes, area) {
  if (area != "sync") { return; }
  
  if (localStorage["use_sync"] == "no") { return; }
  
  console.group("Processing sync changes...");
  
  for (var key in changes) {
    if (typeof changes[key].newValue === "undefined") { // Key deleted
      //delete localStorage[key];
      //console.debug("* Removed key '" + key +"', change object:", changes[key]);
    } else {
      localStorage[key] = changes[key].newValue;
      console.debug("* Updated key '" + key + "', change object:", changes[key]);
    }
  }
  
  console.groupEnd();
}