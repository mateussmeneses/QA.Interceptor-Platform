chrome.runtime.onInstalled.addListener(() => {
  console.log("QA.Interceptor installed");
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "dist/sidepanel.html",
    enabled: true
  });

  await chrome.sidePanel.open({ tabId: tab.id });
});