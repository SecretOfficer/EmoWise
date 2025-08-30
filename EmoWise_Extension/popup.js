document.addEventListener('DOMContentLoaded', function() {
  const toneSelect = document.getElementById('tone-select');
  const analyzeBtn = document.getElementById('analyze-btn');
  const suggestionsContainer = document.getElementById('suggestions');

  // Load saved tone preference
  chrome.storage.sync.get(['selectedTone'], function(result) {
    if (result.selectedTone) {
      toneSelect.value = result.selectedTone;
    }
  });

  // Save tone preference when changed
  toneSelect.addEventListener('change', function() {
    chrome.storage.sync.set({ selectedTone: this.value });
  });

  // Analyze current message button
  analyzeBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getMessageHistory" }, function(response) {
        if (response && response.history && response.history.length > 0) {
          getSuggestions(response.history);
        } else {
          showError("No conversation found. Please open a conversation on Instagram.");
        }
      });
    });
  });

  // Get suggestions from Gemini API via background
  function getSuggestions(conversationHistory) {
    showLoading();
    chrome.storage.sync.get(['selectedTone'], function(result) {
      const tone = result.selectedTone || 'Friendly';
      chrome.runtime.sendMessage(
        { 
          action: "getGeminiSuggestion", 
          conversationHistory: conversationHistory, 
          tone: tone
        },
        function(response) {
          if (response && response.suggestions) {
            displaySuggestions(response.suggestions);
          } else {
            showError(response.error || "Failed to get suggestions.");
          }
        }
      );
    });
  }

  // Display loading state
  function showLoading() {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = `<div class="loading">⏳ Generating suggestions...</div>`;
  }

  // Display error message
  function showError(message) {
    suggestionsContainer.innerHTML = `<p class="error">${message}</p>`;
  }

  // Display suggestions
  function displaySuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      showError("No suggestions available");
      return;
    }
    suggestionsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('button');
      suggestionElement.className = 'emowise-suggestion-glow';
      suggestionElement.textContent = suggestion;
      suggestionElement.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "pasteSuggestion", text: suggestion }
          );
        });
        const chatInput = document.querySelector('textarea'); // Assuming the chat input is a textarea
        if (chatInput) {
          chatInput.value = suggestion; // Not `"${suggestion}"`
        }
        suggestionElement.classList.add('selected');
        setTimeout(() => {
          suggestionElement.classList.remove('selected');
        }, 800);
      });
      suggestionsContainer.appendChild(suggestionElement);
    });
  }

  // Inject glowing button styles for suggestions
  (function injectEmoWisePopupStyles() {
    if (document.getElementById('emowise-popup-style')) return;
    const style = document.createElement('style');
    style.id = 'emowise-popup-style';
    style.textContent = `
      .emowise-suggestion-glow {
        background: linear-gradient(135deg, #F8C8C6 0%, #FFD1DC 100%);
        color: #2d2d2d;
        border: none;
        border-radius: 16px;
        padding: 16px 22px;
        font-size: 1.08em;
        font-weight: 500;
        box-shadow: 0 0 18px 3px rgba(248, 200, 198, 0.5);
        cursor: pointer;
        transition: 
          transform 0.13s cubic-bezier(.4,2,.6,1),
          box-shadow 0.22s cubic-bezier(.4,2,.6,1),
          background 0.22s;
        outline: none;
        margin-bottom: 16px;
        width: 100%;
        text-align: left;
        word-break: break-word;
        letter-spacing: 0.01em;
        position: relative;
        overflow: hidden;
      }
      .emowise-suggestion-glow:hover, .emowise-suggestion-glow.selected {
        background: linear-gradient(135deg, #F5B5B0 0%, #FFC0CB 100%);
        box-shadow: 0 0 32px 8px rgba(245, 181, 176, 0.8);
        transform: scale(1.02);
      }
      .emowise-suggestion-glow:focus {
        outline: 2px solid #fff;
        outline-offset: 2px;
        box-shadow: 0 0 0 3px #F8C8C6, 0 0 32px 8px rgba(255, 209, 220, 0.8);
      }
      .emowise-suggestion-glow::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 16px;
        pointer-events: none;
        background: linear-gradient(120deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%);
        z-index: 2;
      }
      .suggestions-container {
        margin-top: 18px;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .loading, .error {
        color: #2d2d2d;
        text-align: center;
        margin: 18px 0;
      }
      .error { color: #ff6b81; }
    `;
    document.head.appendChild(style);
  })();
});

function getLastMessages(count = 5) {
  // Replace the selector below with the actual selector for chat messages
  const messages = Array.from(document.querySelectorAll('.message-selector'));
  return messages.slice(-count).map(msg => msg.innerText.trim());
}