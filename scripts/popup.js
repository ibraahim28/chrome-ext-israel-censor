document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('toggleButton');
  
    // Get current state
    chrome.storage.local.get('enabled', (data) => {
      // If enabled is undefined (first run), default to true
      const enabled = data.enabled !== undefined ? data.enabled : true;
      
      // Save the default value if it's not set
      if (data.enabled === undefined) {
        chrome.storage.local.set({ enabled: true });
      }
      
      updateButton(enabled);
    });
  
    button.addEventListener('click', () => {
      chrome.storage.local.get('enabled', (data) => {
        const newStatus = !data.enabled;
        chrome.storage.local.set({ enabled: newStatus }, () => {
          updateButton(newStatus);
          
          // Send message to active tab to update in real-time
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {action: "toggle", enabled: newStatus});
            }
          });
        });
      });
    });
  
    function updateButton(enabled) {
      button.textContent = enabled ? 'Turn OFF' : 'Turn ON';
    }
  });