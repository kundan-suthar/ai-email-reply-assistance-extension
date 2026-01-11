chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["geminiApiKey"], (res) => {
    if (!res.geminiApiKey) {
      chrome.tabs.create({ url: "options.html" });
    }
  });
});
