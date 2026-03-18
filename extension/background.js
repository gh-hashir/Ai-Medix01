// background.js - AI Medix Extension Service Worker

// Keep track of active agent tabs and their execution step
// Map of tabId -> { plan: Object, step: 'SEARCH' | 'PRODUCT' }
const activeAgentTabs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_AGENT_PLAN') {
    const plan = message.plan;
    console.log('[AI Medix Background] Executing plan:', plan);

    if (plan.store === 'dawaai') {
      // 1. Construct the search URL
      const searchUrl = `https://dawaai.pk/search?term=${encodeURIComponent(plan.query)}`;

      // 2. Open a new tab
      chrome.tabs.create({ url: searchUrl, active: true }, (tab) => {
        // 3. Register this tab as an active agent job at the 'SEARCH' step
        activeAgentTabs.set(tab.id, { plan, step: 'SEARCH' });
      });
    } else {
      console.warn('Store not supported by agent yet:', plan.store);
    }
  }

  // Handle step completion signal from content script
  if (message.type === 'AGENT_STEP_COMPLETE') {
    if (sender.tab) {
        if (message.nextStep) {
            // Update the state for this tab to the next step
            const currentData = activeAgentTabs.get(sender.tab.id);
            if (currentData) {
                console.log(`[AI Medix Background] Advancing Tab ${sender.tab.id} to step: ${message.nextStep}`);
                activeAgentTabs.set(sender.tab.id, { plan: currentData.plan, step: message.nextStep });
            }
        } else {
            // Automation finished, remove from tracking
            console.log(`[AI Medix Background] Finished all steps for Tab ${sender.tab.id}`);
            activeAgentTabs.delete(sender.tab.id);
        }
    }
  }
});

// Listen for tab updates to inject the content script when the page is fully loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && activeAgentTabs.has(tabId)) {
    const data = activeAgentTabs.get(tabId);
    
    // Safety check: Make sure we are actually on the target domain
    if (tab.url && tab.url.includes('dawaai.pk')) {
      console.log(`[AI Medix Background] Injecting dawaai.js into tab ${tabId} for step ${data.step}`);
      
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/dawaai.js']
      }).then(() => {
        // Send the plan and the current step to the injected script
        chrome.tabs.sendMessage(tabId, {
          type: 'START_AUTOMATION',
          plan: data.plan,
          step: data.step
        });
      }).catch(err => {
        console.error('Failed to inject script:', err);
        // Do not delete from tracking on transient error, maybe it will retry.
      });
    }
  }
});
