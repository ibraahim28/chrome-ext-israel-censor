// Configuration
const TARGET_WORD = /\bisrael\b/gi;
const TARGET_WORD_2 = /\bnetanyahu\b/gi;
const REPLACEMENT = "💩";
const REPLACEMENT_2 = "🤡";

// Global state
let extensionEnabled = true;
let observer = null;
let pendingProcessing = false;
let processedNodes = new WeakSet();

// Process text nodes more efficiently
function processTextNode(textNode) {
  if (!extensionEnabled || processedNodes.has(textNode)) {
    return false;
  }
  
  const originalContent = textNode.nodeValue;
  if (!originalContent) return false;
  
  // Check if the text contains our target words before doing any replacements
  const lowerContent = originalContent.toLowerCase();
  if (!lowerContent.includes('israel') && !lowerContent.includes('netanyahu')) {
    return false;
  }
  
  // Do the actual replacements
  let newContent = originalContent;
  newContent = newContent.replace(TARGET_WORD, REPLACEMENT);
  newContent = newContent.replace(TARGET_WORD_2, REPLACEMENT_2);
  
  if (newContent !== originalContent) {
    textNode.nodeValue = newContent;
    processedNodes.add(textNode);
    return true;
  }
  
  return false;
}

// Process element and its children
function processNode(node) {
  if (!node || !extensionEnabled) return;
  
  // Skip already processed nodes
  if (node.nodeType === Node.ELEMENT_NODE && processedNodes.has(node)) {
    return;
  }
  
  // Process text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  
  // Skip script and style elements
  if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || 
      node.tagName === 'NOSCRIPT' || node.tagName === 'IFRAME') {
    return;
  }
  
  // Process children
  const childNodes = node.childNodes;
  if (childNodes && childNodes.length > 0) {
    for (let i = 0; i < childNodes.length; i++) {
      processNode(childNodes[i]);
    }
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    processedNodes.add(node);
  }
}

// Throttle function to prevent too many executions
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Set up a MutationObserver to handle dynamic content
function observeDOM() {
  if (observer) {
    observer.disconnect();
  }
  
  const throttledProcess = throttle(() => {
    if (pendingProcessing || !extensionEnabled) return;
    
    pendingProcessing = true;
    
    // Use requestIdleCallback if available, otherwise use setTimeout
    const schedule = window.requestIdleCallback || 
                    ((cb) => setTimeout(cb, 0));
    
    schedule(() => {
      processNode(document.body);
      pendingProcessing = false;
    });
  }, 500);
  
  observer = new MutationObserver(throttledProcess);
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Initialize extension
function initialize(enabled) {
  extensionEnabled = enabled;
  processedNodes = new WeakSet(); // Reset processed nodes
  
  if (enabled) {
    // Use requestIdleCallback for initial processing if available
    const schedule = window.requestIdleCallback || 
                    ((cb) => setTimeout(cb, 0));
    
    schedule(() => {
      processNode(document.body);
      observeDOM();
    });
  } else if (observer) {
    observer.disconnect();
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle") {
    initialize(message.enabled);
  }
  sendResponse({success: true});
  return true; // Keep channel open for async response
});

// Check if extension is enabled when page loads
chrome.storage.local.get('enabled', (data) => {
  // Default to enabled if setting doesn't exist yet
  const enabled = data.enabled !== undefined ? data.enabled : true;
  
  // Wait for document to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initialize(enabled);
    });
  } else {
    // Small delay to let page finish initial rendering
    setTimeout(() => initialize(enabled), 100);
  }
});