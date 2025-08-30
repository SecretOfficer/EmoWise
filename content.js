// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getMessage") {
    const message = getLatestMessage();
    sendResponse({ message: message });
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "pasteSuggestion") {
    if (location.hostname.includes("instagram.com")) {
      const input = document.querySelector('div[contenteditable="true"][role="textbox"]');
      if (input) {
        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, request.text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        sendResponse({ success: true });
        return true;
      }
    } else if (location.hostname.includes("whatsapp.com")) {
      // WhatsApp Web message box
      const input = document.querySelector('[contenteditable="true"][data-tab="10"]') ||
                    document.querySelector('[contenteditable="true"][data-tab="6"]') ||
                    document.querySelector('[contenteditable="true"]');
      if (input) {
        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, request.text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        sendResponse({ success: true });
        return true;
      }
    }
    sendResponse({ success: false });
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMessageHistory") {
    let messages = [];
    if (window.location.host.includes("instagram.com")) {
      messages = [
        ...document.querySelectorAll('div[role="listitem"] div[dir="auto"]:not([aria-hidden="true"])'),
        ...document.querySelectorAll('._a9zr ._a9zs, ._a9zr ._a9z6'),
        ...document.querySelectorAll('div[role="listitem"] span'),
        ...document.querySelectorAll('div[role="listitem"] > div > div > div > span'),
        ...document.querySelectorAll('div[role="listitem"] [data-testid="message-text"]'),
        ...document.querySelectorAll('div[role="listitem"] div[tabindex="0"]'),
        ...document.querySelectorAll('div[role="listitem"] div[aria-label][dir="auto"]'),
        ...document.querySelectorAll('div[role="listitem"] [aria-label][dir="auto"]'),
        ...document.querySelectorAll('div[role="listitem"] [data-testid="message-entry"]'),
        ...document.querySelectorAll('div[role="listitem"] [data-testid="message-text-content"]'),
        ...document.querySelectorAll('div[role="row"] div[dir="auto"]'),
        ...document.querySelectorAll('div[aria-label="Message"] div[dir="auto"]'),
        ...document.querySelectorAll('div[role="main"] div[dir="auto"]'),
        ...document.querySelectorAll('div[data-testid="message-text"]'),
        ...document.querySelectorAll('div[role="listitem"] div[tabindex="0"] span')
      ];
      // Remove duplicates and empty messages
      messages = Array.from(new Set(messages)).filter(el => el && el.innerText && el.innerText.trim());
    } else if (window.location.host.includes("whatsapp.com")) {
      messages = Array.from(document.querySelectorAll('div.message-in, div.message-out'));
    }
    const history = messages.slice(-5).map(msg => msg.innerText.trim()).filter(Boolean);
    sendResponse({ history });
  }
  return true;
});

// Function to extract the latest message from Instagram or WhatsApp Web
function getLatestMessage() {
  if (location.hostname.includes("instagram.com")) {
    const selectors = [
      'div[role="row"] div[dir="auto"]',
      'div[role="listitem"] div[dir="auto"]',
      'div[aria-label="Message"] div[dir="auto"]',
      'div[role="main"] div[dir="auto"]',
      'div[data-testid="message-text"]'
    ];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        const message = lastElement.textContent.trim();
        if (message) return message;
      }
    }
  } else if (location.hostname.includes("whatsapp.com")) {
    const elements = document.querySelectorAll('div.message-in span.selectable-text.copyable-text, div.message-out span.selectable-text.copyable-text, span.selectable-text.copyable-text');
    for (let i = elements.length - 1; i >= 0; i--) {
      const message = elements[i].textContent.trim();
      if (message) return message;
    }
  }
  return '';
}