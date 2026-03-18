// content/dawaai.js - AI Medix Agent Automation Script for Dawaai.pk
console.log('[AI Medix Agent] Injected into Dawaai page.');

// Robust helper to wait for an element to exist in the DOM
function waitForElement(selectorList, timeout = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    const interval = setInterval(() => {
      let el = null;
      if (Array.isArray(selectorList)) {
          for (const s of selectorList) {
             el = document.querySelector(s);
             if (el) break;
          }
      } else {
          el = document.querySelector(selectorList);
      }

      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(null); // Timeout silent fail
      }
    }, 500);
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'START_AUTOMATION') {
    const { plan, step } = message;
    console.log(`[AI Medix Agent] Starting automation step: ${step} for ${plan.query}`);

    try {
      if (step === 'SEARCH') {
        console.log('[AI Medix Agent] Phase 1: Clicking first search result');
        
        const selectors = [
            'a.product-card', 
            '.product-details a', 
            '.product-item a', 
            '.card a', 
            '.product-list-item a'
        ];

        // Wait a bit for JS frameworks (like Vue/React) to render list
        await new Promise(r => setTimeout(r, 2000));
        
        let productLink = null;
        for (const sel of selectors) {
            const links = document.querySelectorAll(sel);
            for (const l of links) {
                if (l.href && l.href.includes('/item/')) {
                    productLink = l;
                    break;
                }
            }
            if (productLink) break;
        }

        if (productLink) {
          console.log('[AI Medix Agent] Found product, clicking:', productLink.href);
          // Notify background script that we are mutating the task state and proceeding
          chrome.runtime.sendMessage({ type: 'AGENT_STEP_COMPLETE', nextStep: 'PRODUCT' });
          productLink.click();
        } else {
          console.warn('[AI Medix Agent] Warning: Could not find product link on search page.');
          alert(`AI Medix: Could not find the product "${plan.query}" in Dawaai search results. Please refine your query.`);
          // Tell background we failed and to close out this task
          chrome.runtime.sendMessage({ type: 'AGENT_STEP_COMPLETE' });
        }

      } else if (step === 'PRODUCT') {
        console.log('[AI Medix Agent] Phase 2: Adding to Cart');
        
        await new Promise(r => setTimeout(r, 2500));

        const btnSelectors = [
            'button.add-to-cart', 
            'button[title="Add to cart"]', 
            '.product-add-to-cart button',
            '.add-cart-btn',
            'button.btn-add-to-cart',
            '#add_to_cart'
        ];
        
        let btn = null;
        for (const sel of btnSelectors) {
            btn = document.querySelector(sel);
            if (btn) break;
        }

        if (btn) {
          console.log('[AI Medix Agent] Clicking Add To Cart');
          
          chrome.runtime.sendMessage({ type: 'AGENT_STEP_COMPLETE' }); // End plan execution

          // Highlight element for user reference
          btn.style.boxShadow = '0 0 15px #00f260';
          btn.click();
          
          alert(`✅ AI Medix Agent successfully added ${plan.query} to your Dawaai cart!`);
        } else {
          console.warn('[AI Medix Agent] Warning: Could not find Add to Cart button.');
          chrome.runtime.sendMessage({ type: 'AGENT_STEP_COMPLETE' }); // End plan execution
          alert('AI Medix: Found the product, but could not click Add to Cart automatically.');
        }
      }
    } catch (error) {
      console.error('[AI Medix Agent] Automation Error:', error);
      chrome.runtime.sendMessage({ type: 'AGENT_STEP_COMPLETE' }); 
    }
  }
});
