// bridge.js - Content script for AI Medix website (localhost:3000)
// Listens for window.postMessage from the Next.js app and forwards it to the extension background.

window.addEventListener('message', (event) => {
  // Only accept messages from our own window
  if (event.source !== window || !event.data || event.data.source !== 'ai-medix') {
    return;
  }

  if (event.data.type === 'AGENT_PLAN') {
    console.log('[AI Medix Bridge] Received AGENT_PLAN:', event.data.plan);
    
    // Forward the plan to the background service worker
    chrome.runtime.sendMessage({
      type: 'EXECUTE_AGENT_PLAN',
      plan: event.data.plan
    });
  }
});
