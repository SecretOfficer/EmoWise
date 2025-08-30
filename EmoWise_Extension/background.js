const GEMINI_API_KEY = "AIzaSyDozHcEqAtVQMCTCETL15bgzZvnrkBoN9Y";

const AVAILABLE_MODELS = [
  'gemini-1.5-pro-002',
  'gemini-1.5-pro',
  'gemini-1.5-flash'
];

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getGeminiSuggestion") {
    getGeminiSuggestionWithFallback(request.conversationHistory, request.tone)
      .then(suggestions => {
        sendResponse({ suggestions: suggestions });
      })
      .catch(error => {
        console.error('Gemini API Error:', error);
        sendResponse({ error: error.message || 'Failed to generate suggestions. Please try again.' });
      });
    return true;
  }
});

// Try multiple models for best reliability
async function getGeminiSuggestionWithFallback(conversationHistory, tone) {
  let lastError = null;
  for (const model of AVAILABLE_MODELS) {
    try {
      const suggestions = await getGeminiSuggestion(conversationHistory, tone, model);
      return suggestions;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("All Gemini models failed.");
}

// Call Gemini API
async function getGeminiSuggestion(conversationHistory, tone, model) {
  // Join the conversation array into a readable string
  const historyText = conversationHistory.join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `You are EmoWise, an AI assistant for Instagram DMs. Here is the recent conversation:\n\n${historyText}\n\nBased on this, generate 12-15 creative, concise, and context-aware reply suggestions to the last message in a "${tone}" tone. 

Important guidelines:
1. Use diverse, relevant emojis and avoid repeating the same emoji multiple times and not necesarry to include emoji's for every single thing analyse the situation and behave accordingly and be humanly
2. If the conversation appears to be in Hinglish (Hindi + English), respond appropriately in Hinglish also keep in mind you dont need to add quotes at the start and end
3. Make responses sound natural and human-like
4. Vary the length and style of suggestions
5. Consider the context and relationship between the speakers
6. Avoid clichés and generic responses
7. Match the energy level of the conversation
8. dont add quotes in the start and end

Only return the suggestions as a numbered list.`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error("Gemini API error");

  const data = await response.json();
  // Parse suggestions from the response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // Extract numbered suggestions
  const suggestions = text
    .split(/\n+/)
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  return suggestions.slice(0, 15);
}