chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          // Use a custom event to trigger the command in content script
          window.dispatchEvent(new CustomEvent("chrome-extension-command", { detail: command }));
        }
      });
    }
  });
});
