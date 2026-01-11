function getEmailThread() {
  const bodies = document.querySelectorAll(".a3s.aiL");

  if (!bodies.length) return "";

  const latestBody = bodies[bodies.length - 1];
  return latestBody.innerText.trim();
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const text = getEmailThread();
    sendResponse({ text });
  }
  return true;
});
